import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type BbpsBillerDetailDocument = HydratedDocument<BbpsBillerDetail>;

@Schema({ timestamps: true, collection: "bbpsBillerDetails" })
export class BbpsBillerDetail {
  @Prop({ required: true, unique: true, index: true })
  billerId!: string;

  @Prop({ type: [Object], default: [] })
  parameters!: Array<Record<string, unknown>>;

  @Prop({ type: Object, default: {} })
  raw!: Record<string, unknown>;

  @Prop()
  syncedAt?: Date;
}

export const BbpsBillerDetailSchema =
  SchemaFactory.createForClass(BbpsBillerDetail);
