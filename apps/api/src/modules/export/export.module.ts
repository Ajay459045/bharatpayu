import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BbpsModule } from "../bbps/bbps.module";
import { ExportController } from "./export.controller";
import { ExportLog, ExportLogSchema } from "./schemas/export-log.schema";

@Module({
  imports: [BbpsModule, MongooseModule.forFeature([{ name: ExportLog.name, schema: ExportLogSchema }])],
  controllers: [ExportController]
})
export class ExportModule {}
