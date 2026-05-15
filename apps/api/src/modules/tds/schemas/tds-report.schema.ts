import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type TdsReportDocument = HydratedDocument<TdsReport>;

@Schema({ timestamps: true })
export class TdsReport {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  grossCommission!: number;

  @Prop({ required: true })
  tdsAmount!: number;

  @Prop({ required: true })
  netCommission!: number;

  @Prop({ required: true, index: true })
  transactionId!: string;
}

export const TdsReportSchema = SchemaFactory.createForClass(TdsReport);
