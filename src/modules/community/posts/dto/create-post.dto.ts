import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
