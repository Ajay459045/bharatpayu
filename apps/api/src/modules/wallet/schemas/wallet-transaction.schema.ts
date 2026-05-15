import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type WalletTransactionDocument = HydratedDocument<WalletTransaction>;

@Schema({ timestamps: true })
export class WalletTransaction {
  @Prop({ type: Types.ObjectId, ref: "Wallet", required: true, index: true })
  walletId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ enum: ["debit", "credit"], required: true })
  direction!: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true })
  openingBalance!: number;

  @Prop({ required: true })
  closingBalance!: number;

  @Prop({ required: true, index: true })
  referenceId!: string;

  @Prop({ required: true })
  reason!: string;
}

export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);
WalletTransactionSchema.index({ referenceId: 1, walletId: 1, direction: 1 }, { unique: true });
