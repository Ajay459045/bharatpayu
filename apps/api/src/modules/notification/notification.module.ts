import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Notification, NotificationSchema } from "./schemas/notification.schema";
import { NotificationService } from "./notification.service";

@Module({
  imports: [
    BullModule.registerQueue({ name: "notifications" }),
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }])
  ],
  providers: [NotificationService],
  exports: [NotificationService, MongooseModule]
})
export class NotificationModule {}
