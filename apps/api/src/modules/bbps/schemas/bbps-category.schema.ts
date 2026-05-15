import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type BbpsCategoryDocument = HydratedDocument<BbpsCategory>;

@Schema({ timestamps: true, collection: "bbpsCategories" })
export class BbpsCategory {
  @Prop({ required: true, unique: true, index: true })
  categoryKey!: string;

  @Prop({ required: true, index: true })
  categoryName!: string;

  @Prop()
  iconUrl?: string;

  @Prop({ default: 0 })
  billerList!: number;

  @Prop()
  syncedAt?: Date;
}

export const BbpsCategorySchema = SchemaFactory.createForClass(BbpsCategory);
