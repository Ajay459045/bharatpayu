import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type ExportLogDocument = HydratedDocument<ExportLog>;

@Schema({ timestamps: true })
export class ExportLog {
  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  format!: string;

  @Prop({ type: Object })
  filters!: Record<string, unknown>;

  @Prop({ required: true })
  rowCount!: number;
}

export const ExportLogSchema = SchemaFactory.createForClass(ExportLog);
