import {
  IsDateString,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class PayBillDto {
  @IsString()
  billNumber!: string;

  @IsString()
  billerId!: string;

  @IsString()
  categoryKey!: string;

  @IsString()
  serviceCategory!: string;

  @IsString()
  operator!: string;

  @IsString()
  consumerNumber!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  externalRef?: string;

  @IsOptional()
  @IsObject()
  inputParameters?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
