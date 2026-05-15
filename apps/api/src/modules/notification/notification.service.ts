import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Queue } from "bullmq";
import { Model, Types } from "mongoose";
import { Notification } from "./schemas/notification.schema";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectQueue("notifications") private readonly queue: Queue,
    @InjectModel(Notification.name) private readonly notificationModel: Model<Notification>
  ) {}

  async enqueue(event: string, payload: Record<string, unknown>) {
    const notification = await this.notificationModel.create({
      event,
      payload,
      userId: payload.userId ? new Types.ObjectId(String(payload.userId)) : undefined
    });
    if (process.env.DISABLE_BULLMQ === "true") {
      return notification;
    }
    try {
      await this.queue.add(event, { notificationId: notification._id, event, payload });
    } catch (error) {
      this.logger.warn(`Notification queued in MongoDB but Redis/BullMQ is unavailable for ${event}`);
    }
    return notification;
  }
}
