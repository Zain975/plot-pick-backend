import { IsInt, IsNotEmpty, Min } from "class-validator";

export class AddPlotPointsDto {
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  points!: number;
}
