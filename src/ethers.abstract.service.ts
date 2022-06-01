import { Inject, Injectable, Optional, Logger, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DiscoveredMethodWithMeta, DiscoveryService } from "@golevelup/nestjs-discovery";
import { PATTERN_METADATA } from "@nestjs/microservices/constants";
import { MessageHandler } from "@nestjs/microservices";
import { transformPatternToRoute } from "@nestjs/microservices/utils";
import { providers } from "ethers";
import { EMPTY, Observable } from "rxjs";

import { ETHERS_RPC, MODULE_OPTIONS_PROVIDER } from "./ethers.constants";
import { IModuleOptions } from "./interfaces";

@Injectable()
export abstract class EthersAbstractService {
  constructor(
    @Inject(Logger)
    protected readonly loggerService: LoggerService,
    @Inject(ETHERS_RPC)
    protected readonly provider: providers.JsonRpcProvider,
    protected readonly discoveryService: DiscoveryService,
    protected readonly configService: ConfigService,
    @Optional()
    @Inject(MODULE_OPTIONS_PROVIDER)
    protected options: IModuleOptions,
  ) {}

  protected async getHandlerByPattern<T extends Record<string, string>>(
    route: string,
  ): Promise<DiscoveredMethodWithMeta<T> | undefined> {
    const methods = await this.discoveryService.controllerMethodsWithMetaAtKey<T>(PATTERN_METADATA);
    return methods.find(method => {
      return transformPatternToRoute(method.meta) === route;
    });
  }

  protected async call(pattern: Record<string, string>, data: any, context?: any): Promise<Observable<any>> {
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
