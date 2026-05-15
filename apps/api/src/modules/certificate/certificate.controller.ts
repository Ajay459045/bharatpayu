import { Controller, Get, Param } from "@nestjs/common";

@Controller("certificates")
export class CertificateController {
  @Get(":certificateId/verify")
  verify(@Param("certificateId") certificateId: string) {
    return { certificateId, valid: true, verifiedAt: new Date().toISOString() };
  }
}
