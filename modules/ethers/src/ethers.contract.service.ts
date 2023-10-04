import { Inject, Injectable, Logger, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { transformPatternToRoute } from "@nestjs/microservices/utils";
import { CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import Queue from "bee-queue";

import { from, Observable, Subject } from "rxjs";
import { JsonRpcProvider } from "ethers";

import { getPastEvents, recursivelyDecodeResult } from "./ethers.utils";
import { ETHERS_RPC, MODULE_OPTIONS_PROVIDER, REDIS_QUEUE_PRODUCER } from "./ethers.constants";
import { IEventObj, IModuleOptions, jobSorter } from "./interfaces";
import { mergeAll, mergeMap } from "rxjs/operators";

@Injectable()
export class EthersContractService {
  private instanceId: string;
  private latency: number;
  private fromBlock: number;
  private toBlock: number;

  private subject = new Subject<any>();

  constructor(
    @Inject(Logger)
    protected readonly loggerService: LoggerService,
    @Inject(ETHERS_RPC)
    protected readonly provider: JsonRpcProvider,
    @Inject(REDIS_QUEUE_PRODUCER)
    protected readonly providerRedis: Queue,
    protected readonly configService: ConfigService,
    @Inject(MODULE_OPTIONS_PROVIDER)
    protected options: IModuleOptions,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    this.subject
      // .pipe(mergeMap(({ pattern, description, log }) => from(this.call(pattern, description, log)).pipe(mergeAll()), 1))
      .pipe(mergeMap(allEvents => from(this.call(allEvents)).pipe(mergeAll()), 1))
      .subscribe({
        next: v => {
          loggerService.log(v, `${EthersContractService.name}-${this.instanceId}`);
        },
        error: e => {
          loggerService.error(e);
        },
        complete: () => {
          loggerService.log("complete", `${EthersContractService.name}-${this.instanceId}`);
        },
      });
  }

  public async init(): Promise<void> {
    this.instanceId = (Math.random() + 1).toString(36).substring(7);
    this.latency = ~~this.configService.get<string>("LATENCY", "32");
    this.fromBlock = this.options.block.fromBlock;
    this.toBlock = await this.getLastBlockEth();
    // if block time is more than Cron delay
    if (this.fromBlock > this.toBlock) {
      this.loggerService.log(
        `Init getPastEvents@slowBlock No: ${this.toBlock}`,
        `${EthersContractService.name}-${this.instanceId}`,
      );
      this.toBlock = this.fromBlock;
      return this.getPastEvents(this.fromBlock, this.toBlock);
    }
    // cron config MUST be bigger than Block Time!
    return this.setCronJob(this.options.block.cron || CronExpression.EVERY_30_SECONDS);
  }

  public setCronJob(dto: CronExpression): void {
    const job = new CronJob(dto, async () => {
      await this.listen();
    });

    this.schedulerRegistry.addCronJob(`ethListener_${this.instanceId}`, job);
    job.start();
  }

  public async listen(): Promise<void> {
    // if block time still more than Cron
    if (this.fromBlock > this.toBlock - this.latency) {
      this.loggerService.log(
        `getPastEvents@slowBlock No: ${this.toBlock - this.latency}`,
        `${EthersContractService.name}-${this.instanceId}`,
      );
      this.toBlock = this.fromBlock;
      return this.getPastEvents(this.fromBlock, this.toBlock);
    }
    return this.getPastEvents(this.fromBlock, this.toBlock - this.latency);
  }

  public async getPastEvents(fromBlockNumber: number, toBlockNumber: number): Promise<void> {
    // LAST frontier!
    if (fromBlockNumber > toBlockNumber) {
      this.loggerService.log(
        `getPastEvents@slowBlock No: ${toBlockNumber}`,
        `${EthersContractService.name}-${this.instanceId}`,
      );
      toBlockNumber = fromBlockNumber;
    }

    const { contractAddress, contractInterface, contractType, eventNames = [], topics = [] } = this.options.contract;

    this.loggerService.log(
      `getPastEvents ${contractType} @ ${contractAddress.toString()} @ ${fromBlockNumber}-${toBlockNumber}`,
      `${EthersContractService.name}-${this.instanceId}`,
    );

    // don't listen when no addresses
    if (!contractAddress.length) {
      return;
    }

    const events = await getPastEvents(
      this.provider,
      contractAddress,
      topics,
      fromBlockNumber,
      toBlockNumber,
      1000,
    ).catch(e => {
      this.loggerService.log(JSON.stringify(e, null, "\t"), `${EthersContractService.name}-${this.instanceId}`);
      return [];
    });

    const allEvents = [];

    for (const log of events) {
      const description = contractInterface.parseLog(log as any);

      // LOG PROBLEMS IF ANY
      if (!description || (eventNames.length > 0 && !eventNames.includes(description.name))) {
        if (this.options.block.debug) {
          if (!description) {
            this.loggerService.log("CAN'T PARSE LOG", `${EthersContractService.name}-${this.instanceId}`);
            this.loggerService.log(JSON.stringify(log, null, "\t"), `${EthersContractService.name}-${this.instanceId}`);
          }
          if (description && !eventNames.includes(description.name)) {
            this.loggerService.log(
              `${description.name} NOT FOUND IN EVENTS LIST`,
              `${EthersContractService.name}-${this.instanceId}`,
            );
            this.loggerService.log(eventNames.toString(), `${EthersContractService.name}-${this.instanceId}`);
          }
          this.loggerService.log(
            JSON.stringify(description, null, "\t"),
            `${EthersContractService.name}-${this.instanceId}`,
          );
        }
        continue;
      }

      if (this.options.block.debug) {
        this.loggerService.log(
          JSON.stringify(description, null, "\t"),
          `${EthersContractService.name}-${this.instanceId}`,
        );
      }

      allEvents.push({ pattern: { contractType, eventName: description.name }, description, log });
      // this.subject.next({ pattern: { contractType, eventName: description.name }, description, log });
    }

    // don't call when no events
    if (allEvents.length > 0) {
      this.subject.next(allEvents);
    }

    if (this.toBlock - this.fromBlock <= this.latency) {
      this.fromBlock = this.fromBlock + 1;
      this.toBlock = await this.getLastBlockEth();
    } else {
      this.fromBlock = this.toBlock - this.latency + 1;
      this.toBlock = await this.getLastBlockEth();
    }
  }

  public updateListener(address: Array<string>, fromBlock = 0, topics?: Array<string | Array<string> | null>): void {
    if (address.length === 1) {
      // add single
      const addresses = this.options.contract.contractAddress;
      this.options.contract.contractAddress = [...new Set(addresses.concat(address))];
    } else if (address.length > 1) {
      // update array
      this.options.contract.contractAddress = [...new Set(address)];
    }

    if (fromBlock > 0) {
      this.fromBlock = fromBlock;
    }

    if (topics && topics.length > 0) {
      this.options.contract.topics = topics;
    }

    this.loggerService.log(
      `ETH Listener updated: ${address.join(", ")} @ ${fromBlock} @ ${JSON.stringify(topics)}`,
      `${EthersContractService.name}-${this.instanceId}`,
    );
  }

  public async getLastBlockEth(): Promise<number> {
    return await this.provider.getBlockNumber().catch(err => {
      this.loggerService.error(JSON.stringify(err, null, "\t"), `${EthersContractService.name}-${this.instanceId}`);
      return this.toBlock;
    });
  }

  public getLastBlockOption(): number {
    return this.toBlock - this.latency;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async call(allEvents: Array<IEventObj>): Promise<Observable<any>> {
    // Must sort events by context: blockNumber(hex) -> transactionIndex -> logIndex
    const allEventLogs = allEvents.sort(jobSorter()).map(event => {
      const { pattern, description, log } = event;
      // Get nestjs route
      const route = transformPatternToRoute(pattern);
      // LogDescription.args are readonly =( need to decode ethers.Result to get key: values
      const decoded = {
        fragment: description.fragment,
        name: description.name,
        signature: description.signature,
        topic: description.topic,
        args: recursivelyDecodeResult(description.args),
      };
      return { route, decoded, log };
    });

    // Save all jobs to Redis queue
    allEventLogs.map(event => {
      const { route, decoded, log } = event;

      const job = this.providerRedis.createJob({ route, decoded, context: log });

      return job
        .setId(`${this.options.contract.contractType}_${log.transactionHash}_${log.logIndex}`)
        .timeout(10000)
        .save()
        .then(job => {
          // job enqueued, job.id populated
          this.loggerService.log(
            job.id ? `Created Job ${job.id}` : `Duplicate Job`,
            `${EthersContractService.name}-${this.instanceId}`,
          );
        });
    });

    // await this.providerRedis.saveAll(allJobs).then(_errors => {
    //   this.loggerService.log(
    //     "Duplicate Jobs",
    //     // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    //     `${EthersContractService.name}-${this.instanceId}`,
    //   );
    // });

    return from(["OK"]);

    // const route = transformPatternToRoute(pattern);
    // // LogDescription.args are readonly =(
    // // We need to decode ethers.Result to get key: values
    // // Object.assign(description, { args: recursivelyDecodeResult(description.args) });
    // const decoded = {
    //   fragment: data.fragment,
    //   name: data.name,
    //   signature: data.signature,
    //   topic: data.topic,
    //   args: recursivelyDecodeResult(data.args),
    // };
    // const job = this.providerRedis.createJob({ route, decoded, context });
    // return (
    //   job
    //     .setId(`${this.options.contract.contractType}_${context!.transactionHash}_${context!.logIndex}`)
    //     .timeout(10000)
    //     // .retries(1)
    //     .save()
    //     .then(job => {
    //       this.loggerService.log(`Created Job ${job.id}`, `${EthersContractService.name}-${this.instanceId}`);
    //       if (!job.id) {
    //         this.loggerService.log("Duplicate Job", `${EthersContractService.name}-${this.instanceId}`);
    //       }
    //       // job enqueued, job.id populated
    //       return from(["OK"]);
    //     })
    // );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async destroy(): Promise<void> {
    this.subject.complete();
  }
}
