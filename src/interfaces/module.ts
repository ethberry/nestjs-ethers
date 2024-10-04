import { CronExpression } from "@nestjs/schedule";

export interface IModuleOptions {
  fromBlock: number;
  latency: number;
  debug: boolean;
  cron: CronExpression;
  chunkSize?: number;
}
