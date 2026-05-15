import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Certificate, CertificateSchema } from "./schemas/certificate.schema";
import { CertificateController } from "./certificate.controller";

@Module({
  imports: [MongooseModule.forFeature([{ name: Certificate.name, schema: CertificateSchema }])],
  controllers: [CertificateController]
})
export class CertificateModule {}
