import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
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

  @IsDateString()
  activeStartDate!: string;

  @IsString()
  @IsNotEmpty()
  activeStartTime!: string; // HH:mm format

  @IsDateString()
  closeEndDate!: string;

  @IsString()
  @IsNotEmpty()
  closeEndTime!: string; // HH:mm format

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions!: CreateQuestionDto[];
}
