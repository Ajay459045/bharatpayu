import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type DeviceDocument = HydratedDocument<Device>;

@Schema({ timestamps: true })
export class Device {
  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  userAgent!: string;

  @Prop()
  ip?: string;

  @Prop({ type: Object })
  location?: Record<string, unknown>;

  @Prop()
  timezone?: string;

  @Prop()
  fingerprint?: string;

  @Prop({ default: true })
  trusted!: boolean;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
