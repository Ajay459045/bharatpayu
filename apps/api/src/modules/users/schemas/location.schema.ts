import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type LocationRecordDocument = HydratedDocument<LocationRecord>;

@Schema({ timestamps: true, collection: "locations" })
export class LocationRecord {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  latitude!: number;

  @Prop({ required: true })
  longitude!: number;

  @Prop()
  ipAddress?: string;

  @Prop({ type: Object, default: {} })
  deviceInfo!: Record<string, unknown>;
}

export const LocationRecordSchema = SchemaFactory.createForClass(LocationRecord);
