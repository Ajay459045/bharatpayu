import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type SessionDocument = HydratedDocument<Session>;

@Schema({ timestamps: true })
export class Session {
  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  refreshTokenHash!: string;

  @Prop({ type: Types.ObjectId, ref: "Device" })
  deviceId!: Types.ObjectId;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop()
  revokedAt?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
