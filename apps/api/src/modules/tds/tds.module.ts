import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TdsReport, TdsReportSchema } from "./schemas/tds-report.schema";
import { TdsService } from "./tds.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: TdsReport.name, schema: TdsReportSchema }])],
  providers: [TdsService],
  exports: [TdsService, MongooseModule]
})
export class TdsModule {}
