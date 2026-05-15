import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  event!: string;

  @Prop({ type: Object, required: true })
  payload!: Record<string, unknown>;

  @Prop({ enum: ["queued", "sent", "failed"], default: "queued", index: true })
  status!: string;

  @Prop({ type: [String], default: ["sms", "whatsapp", "email", "push"] })
  channels!: string[];
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
