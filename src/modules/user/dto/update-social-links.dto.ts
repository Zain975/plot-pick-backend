import { IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class UpdateSocialLinksDto {
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: "X URL must be a valid URL" })
  @MaxLength(500)
  xUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: "Instagram URL must be a valid URL" })
  @MaxLength(500)
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: "TikTok URL must be a valid URL" })
  @MaxLength(500)
  tiktokUrl?: string;
}
