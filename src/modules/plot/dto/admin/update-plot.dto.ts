import {
  IsString,
  IsOptional,
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

export class UpdatePlotDto {
  @IsOptional()
  @IsString()
  showId?: string;

  @IsOptional()
  @IsEnum(PlotType)
  type?: PlotType;

  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfQuestions?: number;

  @IsOptional()
  @IsDateString()
  activeStartDate?: string;

  @IsOptional()
  @IsString()
  activeStartTime?: string; // HH:mm format

  @IsOptional()
  @IsDateString()
  closeEndDate?: string;

  @IsOptional()
  @IsString()
  closeEndTime?: string; // HH:mm format

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}
