import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type ServiceTimingDocument = HydratedDocument<ServiceTiming>;

@Schema({ timestamps: true })
export class ServiceTiming {
  @Prop({ required: true, unique: true, index: true })
  serviceCategory!: string;

  @Prop({ required: true })
  startTime!: string;

  @Prop({ required: true })
  endTime!: string;

  @Prop({ default: true })
  enabled!: boolean;
}

export const ServiceTimingSchema = SchemaFactory.createForClass(ServiceTiming);
