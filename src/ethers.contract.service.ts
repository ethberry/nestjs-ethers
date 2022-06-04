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
          loggerService.log(v, EthersContractService.name);
        },
        error: e => {
          loggerService.error(e);
        },
        complete: () => {
          loggerService.log("complete", EthersContractService.name);
        },
      });
  }

  public async init(): Promise<void> {
    this.latency = ~~this.configService.get<string>("LATENCY", "32");
    this.fromBlock = this.options.block.fromBlock || ~~this.configService.get<string>("STARTING_BLOCK", "0");
    this.toBlock = await this.provider.getBlockNumber();
    return this.getPastEvents(this.fromBlock, this.toBlock - this.latency);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  public async listen(): Promise<void> {
    this.fromBlock = this.toBlock - this.latency + 1;
    this.toBlock = await this.provider.getBlockNumber();
    return this.getPastEvents(this.fromBlock, this.toBlock - this.latency);
  }

  public async getPastEvents(fromBlockNumber: number, toBlockNumber: number): Promise<void> {
    const { contractAddress, contractInterface, contractType, eventNames = [] } = this.options.contract;

    // don't listen when no addresses are supplied
    if (!contractAddress.length) {
      return;
    }

    const events = await getPastEvents(this.provider, contractAddress, fromBlockNumber, toBlockNumber, 1000);

    const iface = contractInterface instanceof Interface ? contractInterface : new Interface(contractInterface);

    for (const log of events) {
      const description = parseLog(iface, log);
      if (!description || !eventNames.includes(description.name)) {
        continue;
      }
      this.subject.next({ pattern: { contractType, eventName: description.name }, description, log });
    }
  }

  public updateListener(address: Array<string>, fromBlock?: number): void {
    if (address.length > 0) {
      this.options.contract.contractAddress.push(...address);
    }

    if (fromBlock) {
      this.options.block.fromBlock = fromBlock;
    }
  }

  protected async getHandlerByPattern<T extends Record<string, string>>(
    route: string,
  ): Promise<DiscoveredMethodWithMeta<T> | undefined> {
    const methods = await this.discoveryService.controllerMethodsWithMetaAtKey<T>(PATTERN_METADATA);
    return methods.find(method => {
      return transformPatternToRoute(method.meta) === route;
    });
  }

  protected async call(pattern: Record<string, string>, data: LogDescription, context?: Log): Promise<Observable<any>> {
    const discoveredMethodWithMeta = await this.getHandlerByPattern(transformPatternToRoute(pattern));

    if (!discoveredMethodWithMeta) {
      return Promise.resolve(EMPTY);
    }

    return (
      discoveredMethodWithMeta.discoveredMethod.handler.bind(
        discoveredMethodWithMeta.discoveredMethod.parentClass.instance,
      ) as MessageHandler
    )(data, context);
  }
}
