import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: any = "Internal server error";

    if (exception instanceof HttpException) {
      message = exception.getResponse();
    } else {
      // Log the actual error for debugging
      console.error("Unhandled exception:", exception);
      if (exception instanceof Error) {
        console.error("Error message:", exception.message);
        console.error("Error stack:", exception.stack);
        message =
          process.env.NODE_ENV === "development"
            ? exception.message
            : "Internal server error";
      }
    }

    const errorResponse = {
      statusCode: status,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      message,
    };

    response.status(status).json(errorResponse);
  }
}
