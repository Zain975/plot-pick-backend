import { Injectable, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import twilio from "twilio";
import sgMail from "@sendgrid/mail";
import { TemplateHelper } from "./templates/template.helper";

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private twilioClient?: twilio.Twilio;
  private fromPhoneNumber: string;
  private sendGridApiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor(private readonly configService: ConfigService) {
    // Initialize Twilio for SMS
    const accountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID");
    const authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN");
    this.fromPhoneNumber =
      this.configService.get<string>("TWILIO_PHONE_NUMBER") || "";

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
    }

    // Initialize SendGrid for Email
    this.sendGridApiKey =
      this.configService.get<string>("SENDGRID_API_KEY") || "";
    this.fromEmail =
      this.configService.get<string>("TWILIO_FROM_EMAIL") ||
      "noreply@plotpick.com";
    this.fromName =
      this.configService.get<string>("TWILIO_FROM_NAME") || "PlotPick";

    if (this.sendGridApiKey) {
      sgMail.setApiKey(this.sendGridApiKey);
    }
  }

  /**
   * Send OTP via SMS using Twilio
   * @returns true if SMS was sent successfully, false otherwise
   */
  async sendSmsOtp(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      if (!this.twilioClient || !this.fromPhoneNumber) {
        this.logger.warn("Twilio SMS not configured. OTP would be: " + otp);
        return false;
      }

      const message = `Your PlotPick verification code is: ${otp}. This code expires in 60 seconds.`;

      await this.twilioClient.messages.create({
        body: message,
        from: this.fromPhoneNumber,
        to: phoneNumber,
      });

      this.logger.log(`SMS OTP sent to ${phoneNumber}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to send SMS OTP to ${phoneNumber}: ${error.message}`,
        error.stack
      );
      // Don't throw - let the caller handle the failure
      return false;
    }
  }

  /**
   * Send OTP via Email using SendGrid
   * @returns true if email was sent successfully, false otherwise
   */
  async sendEmailOtp(email: string, otp: string): Promise<boolean> {
    try {
      if (!this.sendGridApiKey) {
        this.logger.warn("SendGrid Email not configured. OTP would be: " + otp);
        return false;
      }

      const emailTemplate = TemplateHelper.renderOtpTemplate(otp);

      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: "Your PlotPick Verification Code",
        html: emailTemplate,
        text: `Your PlotPick verification code is: ${otp}. This code expires in 60 seconds.`,
      };

      await sgMail.send(msg);

      this.logger.log(`Email OTP sent to ${email}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to send Email OTP to ${email}: ${error.message}`,
        error.stack
      );
      // Don't throw - let the caller handle the failure
      return false;
    }
  }
}
