/**
 * Email service abstraction.
 *
 * Provides a common interface for sending transactional emails
 * (password reset, MFA codes, notifications, etc.) so the business
 * logic never depends on a specific email provider.
 *
 * In development the DevEmailLogger simply logs the email to the
 * console. Production implementations can plug in SMTP, SendGrid,
 * Resend, or any other provider behind the same interface.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailService {
  sendPasswordReset(options: {
    to: string;
    resetUrl: string;
    name: string;
  }): Promise<void>;

  sendMfaCode(options: {
    to: string;
    code: string;
    name: string;
  }): Promise<void>;

  send(options: EmailOptions): Promise<void>;
}

// ─── Dev Logger ────────────────────────────────────────────────────────
// Logs emails to the console. Used when no email provider is configured.

export class DevEmailLogger implements EmailService {
  async sendPasswordReset(options: {
    to: string;
    resetUrl: string;
    name: string;
  }): Promise<void> {
    console.log("\n═══════════════════════════════════════════════");
    console.log("📧 [DEV EMAIL] Password Reset");
    console.log(`  To:        ${options.to}`);
    console.log(`  Name:      ${options.name}`);
    console.log(`  Reset URL: ${options.resetUrl}`);
    console.log("═══════════════════════════════════════════════\n");
  }

  async sendMfaCode(options: {
    to: string;
    code: string;
    name: string;
  }): Promise<void> {
    console.log("\n═══════════════════════════════════════════════");
    console.log("📧 [DEV EMAIL] MFA Code");
    console.log(`  To:   ${options.to}`);
    console.log(`  Name: ${options.name}`);
    console.log(`  Code: ${options.code}`);
    console.log("═══════════════════════════════════════════════\n");
  }

  async send(options: EmailOptions): Promise<void> {
    console.log("\n═══════════════════════════════════════════════");
    console.log("📧 [DEV EMAIL] Generic");
    console.log(`  To:      ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    console.log(`  Body:    ${options.text}`);
    console.log("═══════════════════════════════════════════════\n");
  }
}

// ─── Singleton ─────────────────────────────────────────────────────────
// In development, always use the logger. In production, swap with a real
// provider by setting an env var and instantiating the corresponding class.

import { env } from "../config";

let _instance: EmailService;

export function getEmailService(): EmailService {
  if (!_instance) {
    // Future: if (env.EMAIL_PROVIDER === "sendgrid") { _instance = new SendGridEmailService(); }
    // Future: if (env.EMAIL_PROVIDER === "resend") { _instance = new ResendEmailService(); }
    // Future: if (env.EMAIL_PROVIDER === "smtp") { _instance = new SmtpEmailService(); }
    _instance = new DevEmailLogger();
  }
  return _instance;
}
