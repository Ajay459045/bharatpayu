import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type CertificateDocument = HydratedDocument<Certificate>;

@Schema({ timestamps: true })
export class Certificate {
  @Prop({ required: true, unique: true, index: true })
  certificateId!: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ enum: ["retailer", "distributor"], required: true })
  type!: string;

  @Prop({ required: true })
  qrVerificationUrl!: string;
}

export const CertificateSchema = SchemaFactory.createForClass(Certificate);
