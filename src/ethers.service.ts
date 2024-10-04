import { Inject, Injectable, Logger, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MessageHandler } from "@nestjs/microservices";
import { transformPatternToRoute } from "@nestjs/microservices/utils";
import { PATTERN_METADATA } from "@nestjs/microservices/constants";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { EMPTY, from, Observable, Subject } from "rxjs";
import { mergeAll, mergeMap } from "rxjs/operators";
import { JsonRpcProvider, Log } from "ethers";
import { DiscoveredMethodWithMeta, DiscoveryService } from "@golevelup/nestjs-discovery";

import { getPastEvents } from "./utils/get-past-events";
import { ETHERS_RPC, MODULE_OPTIONS_PROVIDER } from "./ethers.constants";
import { IContractOptions, ILogEvent, IModuleOptions } from "./interfaces";
import { recursivelyDecodeResult } from "./utils";

@Injectable()
export class EthersService {
  private instanceId: string;
  private cronLock = false;
  private toBlock = 0;
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
          loggerService.log(v, `${EthersService.name}-${this.instanceId}`);
        },
        error: e => {
          loggerService.error(e);
        },
        complete: () => {
          loggerService.log("complete", `${EthersService.name}-${this.instanceId}`);
        },
      });
  }

  public init(): void {
    // generate instance id
    this.instanceId = (Math.random() + 1).toString(36).substring(7);
    // setup cron job
    return this.setCronJob();
  }

  public setCronJob(): void {
    const job = new CronJob(this.options.cron, async () => {
      // if previous cron task still running - skip
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
    // wait while the system is configured
    if (!this.registry.length) {
      return;
    }

    this.toBlock = (await this.getLastBlock()) - this.options.latency;
    // waiting for confirmation
    if (this.options.fromBlock > this.toBlock) {
      return;
    }

    this.loggerService.log(
      `getPastEvents No: ${this.options.fromBlock} - ${this.toBlock}`,
      `${EthersService.name}-${this.instanceId}`,
    );

    await this.getPastEvents(this.registry, this.options.fromBlock, this.toBlock, this.options.chunkSize);
    this.options.fromBlock = this.toBlock + 1;
  }

  public async getPastEvents(
    registry: Array<IContractOptions>,
    fromBlock: number,
    toBlock: number,
    chunkSize?: number,
  ): Promise<void> {
    const allAddress = registry.reduce<Array<string>>((memo, current) => memo.concat(current.contractAddress), []);
    const allSignatures = registry.reduce<Array<string>>((memo, current) => memo.concat(current.eventSignatures), []);

    const logs = await getPastEvents(this.provider, allAddress, allSignatures, fromBlock, toBlock, chunkSize).catch(
      e => {
        this.loggerService.error(JSON.stringify(e, null, "\t"), `${EthersService.name}-${this.instanceId}`);
        return [];
      },
    );

    for (const log of logs) {
      const contract = registry.find(e =>
        e.contractAddress.map(a => a.toLowerCase()).includes(log.address.toLowerCase()),
      );

      if (!contract) {
        continue;
      }

      const logDescription = contract.contractInterface.parseLog(log);

      // LOG PROBLEMS IF ANY
      if (!logDescription) {
        if (this.options.debug) {
          this.loggerService.log("CAN'T PARSE LOG", `${EthersService.name}-${this.instanceId}`);
          this.loggerService.log(JSON.stringify(log, null, "\t"), `${EthersService.name}-${this.instanceId}`);
        }
        continue;
      }

      this.loggerService.log(JSON.stringify(logDescription, null, "\t"), `${EthersService.name}-${this.instanceId}`);

      this.subject.next({
        pattern: {
          contractType: contract.contractType,
          eventName: logDescription.name,
        },
        description: logDescription,
        log,
      });
    }
  }

  public updateRegistry(contract: IContractOptions): void {
    const entry = this.registry.find(e => e.contractType === contract.contractType);

    if (entry) {
      entry.contractAddress = [...new Set([...entry.contractAddress, ...contract.contractAddress])];
      entry.eventSignatures = [...new Set([...entry.eventSignatures, ...contract.eventSignatures])];
    } else {
      this.registry.push(contract);
    }

    this.loggerService.log(
      `ETH Listener updated: ${contract.contractAddress.join(", ")}`,
      `${EthersService.name}-${this.instanceId}`,
    );
  }

  public async updateRegistryAndReadBlock(contract: IContractOptions, blockNumber: number): Promise<void> {
    this.updateRegistry(contract);
    await this.getPastEvents([contract], blockNumber, blockNumber);
  }

  public getRegistry(): Array<IContractOptions> {
    return this.registry;
  }

  public async getLastBlock(): Promise<number> {
    return await this.provider.getBlockNumber().catch(err => {
      this.loggerService.error(JSON.stringify(err, null, "\t"), `${EthersService.name}-${this.instanceId}`);
      return 0;
    });
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
      this.loggerService.log(`Handler not found for: ${route}`, `${EthersService.name}-${this.instanceId}`);
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
          this.loggerService.error(r.reason, `${EthersService.name}-${this.instanceId}`);
        }
      });
      return from(["OK"]);
    });
  }

  public getLastProcessedBlock() {
    return this.toBlock;
  }

  public destroy(): void {
    this.subject.complete();
  }
}
