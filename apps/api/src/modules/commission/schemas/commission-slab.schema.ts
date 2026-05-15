import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type CommissionSlabDocument = HydratedDocument<CommissionSlab>;

@Schema({ timestamps: true })
export class CommissionSlab {
  @Prop({ required: true, index: true })
  serviceCategory!: string;

  @Prop({ default: "ALL", index: true })
  operator!: string;

  @Prop({
    enum: ["default", "admin_retailer", "distributor_retailer"],
    default: "default",
    index: true,
  })
  scope!: string;

  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  retailerId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  distributorId?: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  minAmount!: number;

  @Prop({ required: true, min: 0 })
  maxAmount!: number;

  @Prop({ enum: ["percent", "flat"], default: "percent" })
  retailerType!: string;

  @Prop({ default: 0 })
  retailerValue!: number;

  @Prop({ enum: ["percent", "flat"], default: "percent" })
  distributorType!: string;

  @Prop({ default: 0 })
  distributorValue!: number;

  @Prop({ enum: ["percent", "flat"], default: "percent" })
  adminType!: string;

  @Prop({ default: 0 })
  adminValue!: number;

  @Prop({ default: true })
  active!: boolean;
}

export const CommissionSlabSchema =
  SchemaFactory.createForClass(CommissionSlab);
CommissionSlabSchema.index({
  serviceCategory: 1,
  operator: 1,
  scope: 1,
  retailerId: 1,
  distributorId: 1,
  minAmount: 1,
  maxAmount: 1,
});
