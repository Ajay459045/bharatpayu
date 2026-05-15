import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type ActivityLogDocument = HydratedDocument<ActivityLog>;

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  action!: string;

  @Prop()
  ipAddress?: string;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
