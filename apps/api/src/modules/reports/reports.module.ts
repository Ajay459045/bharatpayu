import { Module } from "@nestjs/common";
import { BbpsModule } from "../bbps/bbps.module";
import { ReportsController } from "./reports.controller";

@Module({ imports: [BbpsModule], controllers: [ReportsController] })
export class ReportsModule {}
