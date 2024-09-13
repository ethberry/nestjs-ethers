import { Inject, Injectable, Logger, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MessageHandler } from "@nestjs/microservices";
import { transformPatternToRoute } from "@nestjs/microservices/utils";
import { PATTERN_METADATA } from "@nestjs/microservices/constants";
import { CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { EMPTY, from, Observable, Subject } from "rxjs";
import { mergeAll, mergeMap } from "rxjs/operators";
import { JsonRpcProvider, Log } from "ethers";
import { DiscoveredMethodWithMeta, DiscoveryService } from "@golevelup/nestjs-discovery";

import { recursivelyDecodeResult } from "@gemunion/utils-eth";

import { getPastEvents } from "./ethers.utils";
import { DEFAULT_LATENCY, ETHERS_RPC, MODULE_OPTIONS_PROVIDER } from "./ethers.constants";
import { IContractOptions, ILogEvent, IModuleOptions } from "./interfaces";

@Injectable()
export class EthersContractService {
  private instanceId: string;
  private latency: number;
  private fromBlock: number;
  private toBlock: number;
  private cronLock: boolean = false;
  private registry: Array<IContractOptions> = [];

  private subject = new Subject<any>();

  constructor(
    @Inject(Logger)
    protected readonly loggerService: LoggerService,
    @Inject(ETHERS_RPC)
    protected readonly provider: JsonRpcProvider,
    protected readonly discoveryService: DiscoveryService,
    protected readonly configService: ConfigService,
    @Inject(MODULE_OPTIONS_PROVIDER)
    protected options: IModuleOptions,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    this.subject
      .pipe(mergeMap(({ pattern, description, log }) => from(this.call(pattern, description, log)).pipe(mergeAll()), 1))
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
    this.latency = ~~this.configService.get<number>("LATENCY", DEFAULT_LATENCY);
    this.fromBlock = this.options.fromBlock;
    this.toBlock = await this.getLastBlock();
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
    return this.setCronJob(this.options.cron || CronExpression.EVERY_30_SECONDS);
  }

  public setCronJob(dto: CronExpression): void {
    const job = new CronJob(dto, async () => {
      // CHECK CRON LOCK
      if (this.cronLock) {
        return;
      }
      this.cronLock = true;
      await this.listen();
      this.cronLock = false;
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

    // don't listen when no addresses are supplied
    if (!this.registry.length) {
      return;
    }

    const allAddress = this.registry.reduce<Array<string>>((memo, current) => memo.concat(current.contractAddress), []);

    const events = await getPastEvents(this.provider, allAddress, fromBlockNumber, toBlockNumber, 100).catch(e => {
      this.loggerService.log(JSON.stringify(e, null, "\t"), `${EthersContractService.name}-${this.instanceId}`);
      return [];
    });

    for (const log of events) {
      const contract = this.registry.find(e =>
        e.contractAddress.map(a => a.toLowerCase()).includes(log.address.toLowerCase()),
      );

      if (!contract) {
        continue;
      }

      const description = contract.contractInterface.parseLog(log);

      // LOG PROBLEMS IF ANY
      if (!description) {
        if (this.options.debug) {
          this.loggerService.log("CAN'T PARSE LOG", `${EthersContractService.name}-${this.instanceId}`);
          this.loggerService.log(JSON.stringify(log, null, "\t"), `${EthersContractService.name}-${this.instanceId}`);
        }
        continue;
      }

      this.loggerService.log(
        JSON.stringify(description, null, "\t"),
        `${EthersContractService.name}-${this.instanceId}`,
      );

      this.subject.next({
        pattern: {
          contractType: contract.contractType,
          eventName: description.name,
        },
        description,
        log,
      });
    }

    if (this.toBlock - this.fromBlock <= this.latency) {
      this.fromBlock = this.fromBlock + 1;
      this.toBlock = await this.getLastBlock();
    } else {
      this.fromBlock = this.toBlock - this.latency + 1;
      this.toBlock = await this.getLastBlock();
    }
  }

  public updateListener(contract: IContractOptions): void {
    if (this.registry.find(e => e.contractAddress === contract.contractAddress)) {
      throw Error("Duplicate listeners for contract");
    }

    this.registry.push(contract);

    this.loggerService.log(
      `ETH Listener updated: ${contract.contractAddress.join(", ")}`,
      `${EthersContractService.name}-${this.instanceId}`,
    );
  }

  public async getLastBlock(): Promise<number> {
    return await this.provider.getBlockNumber().catch(err => {
      this.loggerService.error(JSON.stringify(err, null, "\t"), `${EthersContractService.name}-${this.instanceId}`);
      return this.toBlock;
    });
  }

  public getLastBlockOption(): number {
    return this.toBlock - this.latency;
  }

  protected async getHandlerByPattern<T extends Array<Record<string, string>>>(
    route: string,
  ): Promise<Array<DiscoveredMethodWithMeta<T>>> {
    const methods = await this.discoveryService.controllerMethodsWithMetaAtKey<T>(PATTERN_METADATA);
    return methods.filter(method => {
      return method.meta.some(meta => transformPatternToRoute(meta) === route);
    });
  }

  protected async call(
    pattern: Record<string, string>,
    description: ILogEvent,
    context?: Log,
  ): Promise<Observable<any>> {
    const route = transformPatternToRoute(pattern);
    const discoveredMethodsWithMeta = await this.getHandlerByPattern(route);

    if (!discoveredMethodsWithMeta.length) {
      this.loggerService.log(`Handler not found for: ${route}`, `${EthersContractService.name}-${this.instanceId}`);
      return Promise.resolve(EMPTY);
    }

    // LogDescription.args are readonly =(
    // We need to decode ethers.Result to get { key: values }
    const decoded = {
      fragment: description.fragment,
      name: description.name,
      signature: description.signature,
      topic: description.topic,
      args: recursivelyDecodeResult(description.args),
    };

    return Promise.allSettled(
      discoveredMethodsWithMeta.map(discoveredMethodWithMeta => {
        return (
          discoveredMethodWithMeta.discoveredMethod.handler.bind(
            discoveredMethodWithMeta.discoveredMethod.parentClass.instance,
          ) as MessageHandler
        )(decoded, context);
      }),
    ).then(res => {
      res.forEach(r => {
        if (r.status === "rejected") {
          this.loggerService.error(r.reason, `${EthersContractService.name}-${this.instanceId}`);
        }
      });
      return from(["OK"]);
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async destroy(): Promise<void> {
    this.subject.complete();
  }
}
