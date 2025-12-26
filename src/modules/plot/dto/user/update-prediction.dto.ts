import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

export class QuestionOptionSelectionDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  @IsString()
  @IsNotEmpty()
  optionId!: string;
}

export class UpdatePredictionDto {
  @IsString()
  @IsNotEmpty()
  plotId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  predictedAmount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionSelectionDto)
  selections?: QuestionOptionSelectionDto[]; // Array of question-option selections to update
}
