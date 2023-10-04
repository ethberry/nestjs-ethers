import { ConfigService } from "@nestjs/config";
import Queue from "bee-queue";

import { REDIS_QUEUE_PRODUCER } from "../ethers.constants";

export const redisQueueProvider = {
  provide: REDIS_QUEUE_PRODUCER,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Queue => {
    // producer queues running on the web server
    const queueName = configService.get<string>("REDIS_QUEUE_NAME", "ETH_EVENTS");
    const sharedConfigSend = {
      storeJobs: false,
      sendEvents: false,
      getEvents: false,
      isWorker: false,
      redis: {
        url: configService.get<string>("REDIS_WS_URL", "redis://localhost:6379/"),
      },
    };
    return new Queue(queueName, sharedConfigSend);
  },
};
