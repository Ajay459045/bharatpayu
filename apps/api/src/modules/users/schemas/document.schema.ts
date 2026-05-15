import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type DocumentRecordDocument = HydratedDocument<DocumentRecord>;

@Schema({ timestamps: true, collection: "documents" })
export class DocumentRecord {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  panImage!: string;

  @Prop({ required: true })
  aadhaarFront!: string;

  @Prop({ required: true })
  aadhaarBack!: string;

  @Prop({ required: true })
  selfie!: string;
}

export const DocumentRecordSchema = SchemaFactory.createForClass(DocumentRecord);
