import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
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

export class CreatePredictionDto {
  @IsString()
  @IsNotEmpty()
  plotId!: string;

  @IsNumber()
  @Min(0)
  predictedAmount!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionSelectionDto)
  selections!: QuestionOptionSelectionDto[]; // Array of question-option selections
}
