import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  createdAt?: Date;

  updatedAt?: Date;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  businessName?: string;

  @Prop({ required: true, unique: true, index: true })
  mobile!: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email!: string;

  @Prop({ unique: true, sparse: true, uppercase: true, index: true })
  retailerCode?: string;

  @Prop({
    enum: ["super_admin", "admin", "distributor", "retailer"],
    required: true,
    index: true,
  })
  role!: string;

  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  distributorId?: Types.ObjectId;

  @Prop()
  passwordHash?: string;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({
    enum: [
      "pending",
      "approved",
      "rejected",
      "suspended",
      "documents_requested",
    ],
    default: "pending",
    index: true,
  })
  approvalStatus!: string;

  @Prop()
  rejectionReason?: string;

  @Prop({ default: false, index: true })
  emailVerified!: boolean;

  @Prop({
    enum: ["not_started", "submitted", "verified", "rejected"],
    default: "not_started",
    index: true,
  })
  kycStatus!: string;

  @Prop({ default: true })
  loginOtpEnabled!: boolean;

  @Prop({
    type: {
      state: String,
      district: String,
      fullAddress: String,
      pincode: String,
    },
    default: {},
  })
  address!: Record<string, string>;

  @Prop({ type: Object, default: {} })
  kyc!: Record<string, unknown>;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ role: 1, isActive: 1 });
