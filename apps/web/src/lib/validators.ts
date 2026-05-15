import { z } from "zod";

export const otpLoginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  otp: z.string().length(6, "OTP must be 6 digits").optional()
});

export const registrationSchema = z.object({
  role: z.enum(["retailer", "distributor"]),
  fullName: z.string().min(3),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  businessName: z.string().min(3),
  state: z.string().min(2),
  district: z.string().min(2),
  fullAddress: z.string().min(8),
  pincode: z.string().regex(/^\d{6}$/),
  documents: z.object({
    panImage: z.string().min(10),
    aadhaarFront: z.string().min(10),
    aadhaarBack: z.string().min(10),
    selfie: z.string().min(10)
  }),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    ipAddress: z.string().optional(),
    deviceInfo: z.record(z.unknown())
  })
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });
