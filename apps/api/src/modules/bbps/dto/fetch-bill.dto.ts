import { IsObject, IsOptional, IsString } from "class-validator";

export class FetchBillDto {
  @IsString()
  billerId!: string;

  @IsOptional()
  @IsString()
  categoryKey?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsString()
  billerName?: string;

  @IsOptional()
  @IsString()
  initChannel?: string;

  @IsOptional()
  @IsString()
  externalRef?: string;

  @IsObject()
  inputParameters!: Record<string, string>;

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  remarks?: Record<string, unknown>;

  @IsOptional()
  transactionAmount?: number;
}
