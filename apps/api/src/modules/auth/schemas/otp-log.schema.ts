import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type OtpLogDocument = HydratedDocument<OtpLog>;

@Schema({ timestamps: true, collection: "otpLogs" })
export class OtpLog {
  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true, lowercase: true, index: true })
  email!: string;

  @Prop({ required: true })
  otp!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ default: false, index: true })
  verified!: boolean;

  @Prop({ enum: ["registration", "login"], required: true, index: true })
  type!: string;

  @Prop()
  challengeId?: string;

  @Prop()
  lastSentAt?: Date;
}

export const OtpLogSchema = SchemaFactory.createForClass(OtpLog);
OtpLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
