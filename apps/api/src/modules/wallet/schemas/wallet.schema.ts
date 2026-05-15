import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type WalletDocument = HydratedDocument<Wallet>;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ enum: ["main", "commission"], required: true })
  type!: string;

  @Prop({ required: true, default: 0, min: 0 })
  balance!: number;

  @Prop({ default: "INR" })
  currency!: string;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
WalletSchema.index({ userId: 1, type: 1 }, { unique: true });
