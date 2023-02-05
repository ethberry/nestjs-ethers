import { Inject, Injectable, Logger, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MessageHandler } from "@nestjs/microservices";
import { transformPatternToRoute } from "@nestjs/microservices/utils";
import { PATTERN_METADATA } from "@nestjs/microservices/constants";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EMPTY, from, Observable, Subject } from "rxjs";
import { providers } from "ethers";
import { Log } from "@ethersproject/abstract-provider";
import { Interface, LogDescription } from "@ethersproject/abi";
import { DiscoveredMethodWithMeta, DiscoveryService } from "@golevelup/nestjs-discovery";

import { getPastEvents, parseLog } from "./ethers.utils";
import { ETHERS_RPC, MODULE_OPTIONS_PROVIDER } from "./ethers.constants";
import { IModuleOptions } from "./interfaces";
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
    protected readonly provider: providers.JsonRpcProvider,
    protected readonly discoveryService: DiscoveryService,
    protected readonly configService: ConfigService,
    @Inject(MODULE_OPTIONS_PROVIDER)
    protected options: IModuleOptions,
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
    return this.getPastEvents(this.fromBlock, this.toBlock - this.latency);
  }

  // MUST be bigger than Block Time!
  @Cron(CronExpression.EVERY_30_SECONDS)
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

    if (this.options.block.debug) {
      this.loggerService.log(
        `getPastEvents ${contractType} @ ${contractAddress.toString()} @ ${fromBlockNumber}-${toBlockNumber}`,
        `${EthersContractService.name}-${this.instanceId}`,
      );
    }

    // don't listen when no addresses are supplied
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

    const iface = contractInterface instanceof Interface ? contractInterface : new Interface(contractInterface);

    for (const log of events) {
      const description = parseLog(iface, log);

      if (!description || !eventNames.includes(description.name)) {
        continue;
      }

      if (this.options.block.debug) {
        this.loggerService.log(
          JSON.stringify(description, null, "\t"),
          `${EthersContractService.name}-${this.instanceId}`,
        );
      }
      this.subject.next({ pattern: { contractType, eventName: description.name }, description, log });
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
    if (address.length > 0) {
      this.options.contract.contractAddress = [...new Set(address)];
    }

    if (fromBlock) {
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

  protected async getHandlerByPattern<T extends Array<Record<string, string>>>(
    route: string,
  ): Promise<Array<DiscoveredMethodWithMeta<T>>> {
    const methods = await this.discoveryService.controllerMethodsWithMetaAtKey<T>(PATTERN_METADATA);
    return methods.filter(method => {
      return method.meta.some(meta => transformPatternToRoute(meta) === route);
    });
  }

  protected async call(pattern: Record<string, string>, data: LogDescription, context?: Log): Promise<Observable<any>> {
    const route = transformPatternToRoute(pattern);
    const discoveredMethodsWithMeta = await this.getHandlerByPattern(route);

    if (!discoveredMethodsWithMeta.length) {
      this.loggerService.log(`Handler not found for: ${route}`, `${EthersContractService.name}-${this.instanceId}`);
      return Promise.resolve(EMPTY);
    }

    return Promise.allSettled(
      discoveredMethodsWithMeta.map(discoveredMethodWithMeta => {
        return (
          discoveredMethodWithMeta.discoveredMethod.handler.bind(
            discoveredMethodWithMeta.discoveredMethod.parentClass.instance,
          ) as MessageHandler
        )(data, context);
      }),
    ).then(res => {
      res.forEach(r => {
        if (r.status === "rejected")
          this.loggerService.error(r.reason, `${EthersContractService.name}-${this.instanceId}`);
      });
      return from(["OK"]);
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async destroy(): Promise<void> {
    this.subject.complete();
  }
}
