import * as Handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";

export enum EmailTemplateType {
  OTP_VERIFICATION = "otp-verification",
  SIGNUP_OTP = "signup-otp",
  LOGIN_OTP = "login-otp",
}

interface TemplateVariables {
  [key: string]: string | number;
}

export class TemplateHelper {
  private static templatesCache: Map<
    EmailTemplateType,
    HandlebarsTemplateDelegate<any>
  > = new Map();

  /**
   * Load and compile a Handlebars template
   * Uses __dirname to resolve template path relative to this file's location
   * Works in both development (src/) and production (dist/)
   */
  private static loadTemplate(
    templateType: EmailTemplateType
  ): HandlebarsTemplateDelegate<any> {
    // Check cache first
    if (this.templatesCache.has(templateType)) {
      return this.templatesCache.get(templateType)!;
    }

    try {
      const templatePath = path.join(__dirname, `${templateType}.hbs`);
      const source = fs.readFileSync(templatePath, "utf8");
      const compiledTemplate = Handlebars.compile(source);

      // Cache the compiled template
      this.templatesCache.set(templateType, compiledTemplate);

      return compiledTemplate;
    } catch (error: any) {
      console.error("Error in loadTemplate:", error);
      throw new Error(
        `Failed to load template ${templateType}: ${error.message}`
      );
    }
  }

  /**
   * Render an email template with variables using Handlebars
   */
  static renderTemplate(
    templateType: EmailTemplateType,
    variables: TemplateVariables
  ): string {
    const template = this.loadTemplate(templateType);
    return template(variables);
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
