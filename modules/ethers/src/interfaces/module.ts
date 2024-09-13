import { CronExpression } from "@nestjs/schedule";

export interface IModuleOptions {
  fromBlock: number;
  debug: boolean;
  cron?: CronExpression;
}
