import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  Min,
  Matches,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PlotType } from "@prisma/client";
import { CreateQuestionDto } from "./create-question.dto";

export class CreatePlotDto {
  @IsString()
  @IsNotEmpty()
  showId!: string;

  @IsEnum(PlotType)
  type!: PlotType;

  @IsInt()
  @Min(1)
  numberOfQuestions!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "activeStartDate must be in YYYY-MM-DD format",
  })
  activeStartDate!: string; // YYYY-MM-DD format

  @IsString()
  @IsNotEmpty()
  activeStartTime!: string; // HH:mm format

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "closeEndDate must be in YYYY-MM-DD format",
  })
  closeEndDate!: string; // YYYY-MM-DD format

  @IsString()
  @IsNotEmpty()
  closeEndTime!: string; // HH:mm format

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions!: CreateQuestionDto[];
}
