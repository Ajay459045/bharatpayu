import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type LedgerDocument = HydratedDocument<Ledger>;

@Schema({ timestamps: true })
export class Ledger {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  openingBalance!: number;

  @Prop({ default: 0 })
  debit!: number;

  @Prop({ default: 0 })
  credit!: number;

  @Prop({ default: 0 })
  commission!: number;

  @Prop({ default: 0 })
  tds!: number;

  @Prop({ required: true })
  closingBalance!: number;

  @Prop({ required: true, index: true })
  transactionId!: string;

  @Prop()
  ipAddress?: string;

  @Prop({ type: Object })
  deviceInfo?: Record<string, unknown>;

  @Prop({ type: Object })
  location?: Record<string, unknown>;
}

export const LedgerSchema = SchemaFactory.createForClass(Ledger);
LedgerSchema.index({ userId: 1, createdAt: -1 });
