import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type AdminSettlementRequestDocument =
  HydratedDocument<AdminSettlementRequest>;

@Schema({ timestamps: true, collection: "adminSettlementRequests" })
export class AdminSettlementRequest {
  createdAt?: Date;

  updatedAt?: Date;

  @Prop({
    type: Types.ObjectId,
    ref: "BbpsTransaction",
    required: true,
    index: true,
  })
  transactionMongoId!: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  transactionId!: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  retailerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  distributorId?: Types.ObjectId;

  @Prop({ required: true })
  customerName!: string;

  @Prop({ required: true })
  consumerNumber!: string;

  @Prop({ required: true })
  operator!: string;

  @Prop({ required: true })
  serviceCategory!: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ enum: ["debited", "refunded"], default: "debited" })
  walletStatus!: string;

  @Prop({
    enum: ["pending_approval", "hold", "final_success", "rejected"],
    default: "pending_approval",
    index: true,
  })
  status!: string;

  @Prop()
  bbpsReferenceId?: string;

  @Prop()
  notes?: string;

  @Prop()
  rejectionReason?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  reviewedBy?: Types.ObjectId;

  @Prop()
  settledAt?: Date;
}

export const AdminSettlementRequestSchema = SchemaFactory.createForClass(
  AdminSettlementRequest,
);
