import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type BbpsTransactionDocument = HydratedDocument<BbpsTransaction>;

@Schema({ timestamps: true })
export class BbpsTransaction {
  @Prop({ required: true, unique: true, index: true })
  transactionId!: string;

  @Prop({ required: true, unique: true, index: true })
  idempotencyKey!: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  retailerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  distributorId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  serviceCategory!: string;

  @Prop({ required: true, index: true })
  operator!: string;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ required: true })
  consumerNumber!: string;

  @Prop({ required: true })
  billNumber!: string;

  @Prop({ required: true })
  billerId!: string;

  @Prop({ required: true })
  categoryKey!: string;

  @Prop({ type: Object, default: {} })
  inputParameters!: Record<string, unknown>;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true })
  dueDate!: Date;

  @Prop({
    enum: ["pending", "success", "failed", "refunded"],
    default: "pending",
    index: true,
  })
  status!: string;

  @Prop({
    enum: ["pending_approval", "hold", "final_success", "rejected"],
    default: "pending_approval",
    index: true,
  })
  settlementStatus!: string;

  @Prop()
  settlementId?: string;

  @Prop()
  bbpsReferenceId?: string;

  @Prop()
  settlementNotes?: string;

  @Prop()
  settledAt?: Date;

  @Prop({ default: 0 })
  retailerCommission!: number;

  @Prop({ default: 0 })
  distributorCommission!: number;

  @Prop({ default: 0 })
  tdsAmount!: number;

  @Prop({ type: Object })
  apiResponse?: Record<string, unknown>;
}

export const BbpsTransactionSchema =
  SchemaFactory.createForClass(BbpsTransaction);
BbpsTransactionSchema.index({ serviceCategory: 1, status: 1, createdAt: -1 });
