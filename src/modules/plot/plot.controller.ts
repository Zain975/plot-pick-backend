import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ValidationPipe,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PlotService } from "./plot.service";
import { CreateShowWithEpisodeDto } from "./dto/admin/create-show-with-episode.dto";
import { UpdateShowWithEpisodeDto } from "./dto/admin/update-show-with-episode.dto";
import { AnnounceResultsDto } from "./dto/admin/announce-results.dto";
import { UpdatePlotStatusDto } from "./dto/admin/update-plot-status.dto";
import { CreatePredictionDto } from "./dto/user/create-prediction.dto";
import { AdminGuard } from "../../common/guards/admin.guard";
import { UserGuard } from "../../common/guards/user.guard";
import { S3Service } from "../s3/s3.service";
import { PlotStatus } from "@prisma/client";

@Controller("plot")
export class PlotController {
  constructor(
    private readonly plotService: PlotService,
    private readonly s3Service: S3Service
  ) {}

  // ==================== ADMIN: Show + Episode Endpoints ====================

  @UseGuards(AdminGuard)
  @Post("admin/shows")
  @UseInterceptors(FileInterceptor("thumbnail"))
  async createShowWithEpisode(
    @Body()
    body: any, // Use any to handle form-data parsing before validation
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB max
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|gif|webp)$/,
          }),
        ],
        fileIsRequired: false,
      })
    )
    thumbnailFile?: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    }
  ) {
    // Parse JSON strings from form-data and convert types
    if (typeof body.questions === "string") {
      try {
        body.questions = JSON.parse(body.questions);
      } catch (error) {
        throw new HttpException(
          "Invalid JSON format for questions field",
          HttpStatus.BAD_REQUEST
        );
      }
    }

    // Parse numeric strings to numbers
    if (body.seasonNumber && typeof body.seasonNumber === "string") {
      body.seasonNumber = parseInt(body.seasonNumber, 10);
    }
    if (body.episode && typeof body.episode === "string") {
      body.episode = parseInt(body.episode, 10);
    }
    if (body.numberOfQuestions && typeof body.numberOfQuestions === "string") {
      body.numberOfQuestions = parseInt(body.numberOfQuestions, 10);
    }
    if (body.minimumAmount && typeof body.minimumAmount === "string") {
      body.minimumAmount = parseFloat(body.minimumAmount);
    }
    if (body.maximumAmount && typeof body.maximumAmount === "string") {
      body.maximumAmount = parseFloat(body.maximumAmount);
    }
    if (body.payoutAmount && typeof body.payoutAmount === "string") {
      body.payoutAmount = parseFloat(body.payoutAmount);
    }
    if (body.plotpicksVig && typeof body.plotpicksVig === "string") {
      body.plotpicksVig = parseFloat(body.plotpicksVig);
    }
    if (
      body.bonusAmount &&
      typeof body.bonusAmount === "string" &&
      body.bonusAmount
    ) {
      body.bonusAmount = parseFloat(body.bonusAmount);
    }
    if (body.bonusKicker && typeof body.bonusKicker === "string") {
      body.bonusKicker = body.bonusKicker === "true";
    }

    // Upload thumbnail to S3 if provided (before validation)
    if (thumbnailFile) {
      const folder = "admin/shows";
      const key = this.s3Service.generateS3Key(
        folder,
        "show",
        thumbnailFile.originalname,
        `show-${Date.now()}`
      );
      const thumbnailUrl = await this.s3Service.uploadFileBuffer(
        thumbnailFile,
        key
      );
      body.thumbnailUrl = thumbnailUrl;
    } else {
      // Remove thumbnailUrl from body if no file is provided to avoid overwriting with empty string
      delete body.thumbnailUrl;
    }

    // Validate the parsed body
    const validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    });
    const validatedBody = await validationPipe.transform(body, {
      type: "body",
      metatype: CreateShowWithEpisodeDto,
    });

    return this.plotService.createShowWithEpisode(validatedBody);
  }

  @UseGuards(AdminGuard)
  @Patch("admin/shows/:showId/episodes/:episodeNumber")
  @UseInterceptors(FileInterceptor("thumbnail"))
  async updateShowWithEpisode(
    @Param("showId") showId: string,
    @Param("episodeNumber") episodeNumber: string,
    @Body()
    body: any, // Use any to handle form-data parsing before validation
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB max
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|gif|webp)$/,
          }),
        ],
        fileIsRequired: false,
      })
    )
    thumbnailFile?: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    }
  ) {
    const episodeNum = parseInt(episodeNumber, 10);
    if (isNaN(episodeNum) || episodeNum < 1) {
      throw new HttpException("Invalid episode number", HttpStatus.BAD_REQUEST);
    }

    // Parse JSON strings from form-data
    if (body.questions && typeof body.questions === "string") {
      try {
        body.questions = JSON.parse(body.questions);
      } catch (error) {
        throw new HttpException(
          "Invalid JSON format for questions field",
          HttpStatus.BAD_REQUEST
        );
      }
    }

    // Parse numeric strings to numbers
    if (body.seasonNumber && typeof body.seasonNumber === "string") {
      body.seasonNumber = parseInt(body.seasonNumber, 10);
    }
    if (body.episode && typeof body.episode === "string") {
      body.episode = parseInt(body.episode, 10);
    }
    if (body.numberOfQuestions && typeof body.numberOfQuestions === "string") {
      body.numberOfQuestions = parseInt(body.numberOfQuestions, 10);
    }
    if (body.minimumAmount && typeof body.minimumAmount === "string") {
      body.minimumAmount = parseFloat(body.minimumAmount);
    }
    if (body.maximumAmount && typeof body.maximumAmount === "string") {
      body.maximumAmount = parseFloat(body.maximumAmount);
    }
    if (body.payoutAmount && typeof body.payoutAmount === "string") {
      body.payoutAmount = parseFloat(body.payoutAmount);
    }
    if (body.plotpicksVig && typeof body.plotpicksVig === "string") {
      body.plotpicksVig = parseFloat(body.plotpicksVig);
    }
    if (body.bonusAmount && typeof body.bonusAmount === "string") {
      body.bonusAmount = parseFloat(body.bonusAmount);
    }
    if (body.bonusKicker && typeof body.bonusKicker === "string") {
      body.bonusKicker = body.bonusKicker === "true";
    }

    // Upload new thumbnail to S3 if provided (before validation)
    if (thumbnailFile) {
      const folder = "admin/shows";
      const key = this.s3Service.generateS3Key(
        folder,
        "show",
        thumbnailFile.originalname,
        `show-${Date.now()}`
      );
      const thumbnailUrl = await this.s3Service.uploadFileBuffer(
        thumbnailFile,
        key
      );
      body.thumbnailUrl = thumbnailUrl;
    } else {
      // Remove thumbnailUrl from body if no file is provided to avoid overwriting with empty string
      delete body.thumbnailUrl;
    }

    // Validate the parsed body
    const validationPipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    });
    const validatedBody = await validationPipe.transform(body, {
      type: "body",
      metatype: UpdateShowWithEpisodeDto,
    });

    return this.plotService.updateShowWithEpisode(
      showId,
      episodeNum,
      validatedBody
    );
  }

  @UseGuards(AdminGuard)
  @Get("admin/shows")
  async getAllShows(
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.plotService.getAllShows(pageNum, limitNum);
  }

  @UseGuards(AdminGuard)
  @Get("admin/shows/:showId")
  async getShowById(@Param("showId") showId: string) {
    return this.plotService.getShowById(showId);
  }

  @UseGuards(AdminGuard)
  @Delete("admin/shows/:showId")
  async deleteShow(@Param("showId") showId: string) {
    return this.plotService.deleteShow(showId);
  }

  @UseGuards(AdminGuard)
  @Delete("admin/shows/:showId/episodes/:episodeNumber")
  async deleteEpisode(
    @Param("showId") showId: string,
    @Param("episodeNumber") episodeNumber: string
  ) {
    const episodeNum = parseInt(episodeNumber, 10);
    if (isNaN(episodeNum) || episodeNum < 1) {
      throw new HttpException("Invalid episode number", HttpStatus.BAD_REQUEST);
    }
    return this.plotService.deleteEpisode(showId, episodeNum);
  }

  // ==================== ADMIN: Plot Management Endpoints ====================

  @UseGuards(AdminGuard)
  @Get("admin/plots")
  async getAllPlots(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const plotStatus = status ? (status as PlotStatus) : undefined;
    return this.plotService.getAllPlots(plotStatus, pageNum, limitNum);
  }

  @UseGuards(AdminGuard)
  @Get("admin/plots/:plotId")
  async getPlotById(@Param("plotId") plotId: string) {
    return this.plotService.getPlotById(plotId);
  }

  @UseGuards(AdminGuard)
  @Patch("admin/plots/:plotId/status")
  async updatePlotStatus(
    @Param("plotId") plotId: string,
    @Body(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      })
    )
    body: UpdatePlotStatusDto
  ) {
    return this.plotService.updatePlotStatus(plotId, body.status);
  }

  @UseGuards(AdminGuard)
  @Post("admin/questions/:questionId/pause")
  async pauseQuestion(@Param("questionId") questionId: string) {
    return this.plotService.pauseQuestion(questionId);
  }

  @UseGuards(AdminGuard)
  @Post("admin/questions/:questionId/unpause")
  async unpauseQuestion(@Param("questionId") questionId: string) {
    return this.plotService.unpauseQuestion(questionId);
  }

  @UseGuards(AdminGuard)
  @Post("admin/plots/announce-results")
  async announceResults(
    @Body(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      })
    )
    body: AnnounceResultsDto
  ) {
    return this.plotService.announceResults(body);
  }

  // ==================== USER: Plot Viewing Endpoints ====================

  @UseGuards(UserGuard)
  @Get("active")
  async getActivePlots(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const plotStatus = status ? (status as PlotStatus) : undefined;
    return this.plotService.getActivePlots(pageNum, limitNum, plotStatus);
  }

  @UseGuards(UserGuard)
  @Get(":plotId")
  async getPlotDetails(@Request() req: any, @Param("plotId") plotId: string) {
    const userId = req.user.id;
    return this.plotService.getPlotDetailsForUser(plotId, userId);
  }

  // ==================== USER: Prediction Endpoints ====================

  @UseGuards(UserGuard)
  @Post("predictions")
  async createPrediction(
    @Request() req: any,
    @Body(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      })
    )
    body: CreatePredictionDto
  ) {
    const userId = req.user.id;
    return this.plotService.createPrediction(userId, body);
  }

  @UseGuards(UserGuard)
  @Get("predictions/my")
  async getUserPredictions(
    @Request() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const userId = req.user.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.plotService.getUserPredictions(userId, pageNum, limitNum);
  }

  @UseGuards(UserGuard)
  @Get("my/plots")
  async getUserPlots(
    @Request() req: any,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const userId = req.user.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.plotService.getUserPlots(userId, pageNum, limitNum);
  }
}
