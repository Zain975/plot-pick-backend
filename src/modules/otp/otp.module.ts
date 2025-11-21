import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma.module";
import { OtpService } from "./otp.service";

@Module({
  imports: [PrismaModule],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
