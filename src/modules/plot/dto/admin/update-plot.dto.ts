import {
  IsString,
  IsOptional,
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
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "activeStartDate must be in YYYY-MM-DD format",
  })
  activeStartDate?: string; // YYYY-MM-DD format

  @IsOptional()
  @IsString()
  activeStartTime?: string; // HH:mm format

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "closeEndDate must be in YYYY-MM-DD format",
  })
  closeEndDate?: string; // YYYY-MM-DD format

  @IsOptional()
  @IsString()
  closeEndTime?: string; // HH:mm format

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions?: CreateQuestionDto[];
}
