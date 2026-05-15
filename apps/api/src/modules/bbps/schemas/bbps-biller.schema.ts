import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type BbpsBillerDocument = HydratedDocument<BbpsBiller>;

@Schema({ timestamps: true, collection: "bbpsBillers" })
export class BbpsBiller {
  @Prop({ required: true, unique: true, index: true })
  billerId!: string;

  @Prop({ required: true, index: true })
  billerName!: string;

  @Prop({ required: true, index: true })
  categoryKey!: string;

  @Prop()
  categoryName?: string;

  @Prop()
  type?: string;

  @Prop()
  coverageCity?: string;

  @Prop()
  coverageState?: string;

  @Prop()
  coveragePincode?: string;

  @Prop()
  updatedDate?: string;

  @Prop({ default: "ACTIVE", index: true })
  billerStatus!: string;

  @Prop({ default: true, index: true })
  isAvailable!: boolean;

  @Prop()
  iconUrl?: string;

  @Prop()
  syncedAt?: Date;
}

export const BbpsBillerSchema = SchemaFactory.createForClass(BbpsBiller);
BbpsBillerSchema.index({ categoryKey: 1, billerName: 1 });
