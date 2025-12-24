import { IsEnum, IsNotEmpty } from "class-validator";
import { PlotStatus } from "@prisma/client";

export class UpdatePlotStatusDto {
  @IsEnum(PlotStatus)
  @IsNotEmpty()
  status!: PlotStatus;
}
