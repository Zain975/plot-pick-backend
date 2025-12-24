import {
  IsString,
  IsNotEmpty,
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

export class CreateShowWithEpisodeDto {
  // Show fields
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsInt()
  @Min(1)
  seasonNumber!: number;

  @IsInt()
  @Min(1)
  episode!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  minimumAmount!: number;

  @IsNumber()
  @Min(0)
  maximumAmount!: number;

  @IsNumber()
  @Min(0)
  payoutAmount!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  plotpicksVig!: number;

  @IsBoolean()
  bonusKicker!: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonusAmount?: number;

  // Episode (Plot) fields
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
