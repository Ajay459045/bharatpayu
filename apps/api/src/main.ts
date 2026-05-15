import { ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as compression from "compression";
import * as cookieParser from "cookie-parser";
import * as dns from "dns";
import { json, urlencoded } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./shared/all-exceptions.filter";

async function bootstrap() {
  dns.setServers((process.env.DNS_SERVERS ?? "8.8.8.8,1.1.1.1").split(","));
  const app = await NestFactory.create(AppModule, { cors: false, bodyParser: false });
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
  app.use(helmet());
  app.use(json({ limit: process.env.JSON_BODY_LIMIT ?? "25mb" }));
  app.use(urlencoded({ extended: true, limit: process.env.JSON_BODY_LIMIT ?? "25mb" }));
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: [/localhost:\d+$/, /bharatpayu\.com$/],
    credentials: true
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  const swagger = new DocumentBuilder()
    .setTitle("BharatPayU BBPS API")
    .setDescription("Admin, distributor, retailer, wallet, ledger, BBPS, reports, and exports API.")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swagger));

  await app.listen(process.env.API_PORT ? Number(process.env.API_PORT) : 4000);
}

bootstrap();
