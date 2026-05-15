import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type TransactionLogDocument = HydratedDocument<TransactionLog>;

@Schema({ timestamps: true })
export class TransactionLog {
  @Prop({ required: true, index: true })
  transactionId!: string;

  @Prop({ required: true })
  event!: string;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;
}

export const TransactionLogSchema =
  SchemaFactory.createForClass(TransactionLog);
