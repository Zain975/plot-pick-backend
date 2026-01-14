import { readFileSync } from "fs";
import { join } from "path";

export enum EmailTemplateType {
  OTP_VERIFICATION = "otp-verification",
  SIGNUP_OTP = "signup-otp",
  LOGIN_OTP = "login-otp",
}

interface TemplateVariables {
  [key: string]: string | number;
}

export class TemplateHelper {
  /**
   * Get templates directory path
   * Works in both development and production
   * Since template.helper.ts is inside the templates folder, __dirname is the templates directory
   */
  private static getTemplatesDir(): string {
    // __dirname points to the templates directory (where this file is located)
    // This works in both development and production if templates are copied to dist
    return __dirname;
  }

  /**
   * Load and render an email template with variables
   */
  static renderTemplate(
    templateType: EmailTemplateType,
    variables: TemplateVariables
  ): string {
    try {
      const templatesDir = this.getTemplatesDir();
      const templatePath = join(templatesDir, `${templateType}.html`);
      let template = readFileSync(templatePath, "utf-8");

      // Replace template variables
      Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, "g");
        template = template.replace(regex, String(variables[key]));
      });

      return template;
    } catch (error: any) {
      throw new Error(
        `Failed to load template ${templateType}: ${error.message}`
      );
    }
  }

  /**
   * Render OTP verification template
   */
  static renderOtpTemplate(otp: string): string {
    return this.renderTemplate(EmailTemplateType.OTP_VERIFICATION, {
      OTP: otp,
      YEAR: new Date().getFullYear(),
    });
  }
}
