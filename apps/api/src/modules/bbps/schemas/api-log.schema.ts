import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ApiLogDocument = HydratedDocument<ApiLog>;

@Schema({ timestamps: true })
export class ApiLog {
  @Prop({ required: true, index: true })
  provider!: string;

  @Prop({ required: true })
  endpoint!: string;

  @Prop({ required: true })
  direction!: "request" | "response";

  @Prop({ type: Object })
  payload!: Record<string, unknown>;

  @Prop()
  statusCode?: number;

  @Prop({ index: true })
  transactionId?: string;
}

export const ApiLogSchema = SchemaFactory.createForClass(ApiLog);
