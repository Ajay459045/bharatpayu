import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type SecuritySettingDocument = HydratedDocument<SecuritySetting>;

@Schema({ timestamps: true })
export class SecuritySetting {
  @Prop({ required: true, unique: true, default: "global" })
  key!: string;

  @Prop({ default: true })
  loginOtpEnabled!: boolean;
}

export const SecuritySettingSchema = SchemaFactory.createForClass(SecuritySetting);
