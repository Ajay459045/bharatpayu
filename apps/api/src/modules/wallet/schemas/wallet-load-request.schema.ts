import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type WalletLoadRequestDocument = HydratedDocument<WalletLoadRequest>;

@Schema({ timestamps: true })
export class WalletLoadRequest {
  createdAt?: Date;

  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  amount!: number;

  @Prop({ required: true, trim: true, uppercase: true, index: true })
  utrNumber!: string;

  @Prop({ required: true })
  screenshot!: string;

  @Prop({
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    index: true,
  })
  status!: string;

  @Prop()
  adminNote?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  reviewedBy?: Types.ObjectId;

  @Prop()
  reviewedAt?: Date;

  @Prop()
  creditedTransactionId?: string;
}

export const WalletLoadRequestSchema =
  SchemaFactory.createForClass(WalletLoadRequest);
WalletLoadRequestSchema.index({ utrNumber: 1 }, { unique: true });
