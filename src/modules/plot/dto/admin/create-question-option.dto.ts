import { IsString, IsNotEmpty, IsInt, Min } from "class-validator";

export class CreateQuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  optionText!: string;

  @IsInt()
  @Min(1)
  order!: number;
}
