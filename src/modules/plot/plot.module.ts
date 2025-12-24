import { Module } from "@nestjs/common";
import { PlotController } from "./plot.controller";
import { PlotService } from "./plot.service";
import { PrismaModule } from "../../database/prisma.module";
import { S3Module } from "../s3/s3.module";

@Module({
  imports: [PrismaModule, S3Module],
  controllers: [PlotController],
  providers: [PlotService],
  exports: [PlotService],
})
export class PlotModule {}
