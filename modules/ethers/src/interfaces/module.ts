import { CronExpression } from "@nestjs/schedule";

export interface IModuleOptions {
  fromBlock: number;
  toBlock: number;
  latency: number;
  debug: boolean;
  cron?: CronExpression;
}
