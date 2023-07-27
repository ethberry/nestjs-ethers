import { CronExpression } from "@nestjs/schedule";

export interface IBlockOptions {
  fromBlock: number;
  debug: boolean;
  cron?: CronExpression;
}
