import { BullModule, getQueueToken } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { isBullMqDisabled } from "../../shared/bullmq-toggle";
import { Notification, NotificationSchema } from "./schemas/notification.schema";
import { NotificationService } from "./notification.service";

const notificationQueueProvider = {
  provide: getQueueToken("notifications"),
  useValue: {
    add: async () => undefined
  }
};

@Module({
  imports: [
    ...(isBullMqDisabled() ? [] : [BullModule.registerQueue({ name: "notifications" })]),
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }])
  ],
  providers: [
    ...(isBullMqDisabled() ? [notificationQueueProvider] : []),
    NotificationService
  ],
  exports: [NotificationService, MongooseModule]
})
export class NotificationModule {}
