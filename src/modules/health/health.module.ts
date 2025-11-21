import { Module } from "@nestjs/common";
import {
  MemoryHealthIndicator,
  PrismaHealthIndicator,
  TerminusModule,
} from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { PrismaModule } from "../../database/prisma.module";

@Module({
  imports: [TerminusModule, PrismaModule],
  providers: [MemoryHealthIndicator, PrismaHealthIndicator],
  controllers: [HealthController],
})
export class HealthModule {}
