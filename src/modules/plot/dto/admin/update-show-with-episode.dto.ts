import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  IsDateString,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PlotType } from "@prisma/client";
import { CreateQuestionDto } from "./create-question.dto";

export class UpdateShowWithEpisodeDto {
  // Show fields
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  seasonNumber?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  episode?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  payoutAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  plotpicksVig?: number;

  @IsOptional()
  @IsBoolean()
  bonusKicker?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusAmount?: number;

  // Episode (Plot) fields
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
