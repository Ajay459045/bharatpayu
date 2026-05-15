import { IsObject, IsOptional, IsString } from "class-validator";

export class FetchBillDto {
  @IsString()
  billerId!: string;

  @IsString()
  categoryKey!: string;

  @IsString()
  categoryName!: string;

  @IsString()
  billerName!: string;

  @IsObject()
  inputParameters!: Record<string, string>;

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, unknown>;
}
