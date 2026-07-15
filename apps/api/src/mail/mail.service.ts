import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /** 寄信；未設定 SMTP 時退回 log（不丟錯，避免影響主流程） */
  async sendMail(opts: { to: string; subject: string; html: string }) {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || `"南瓜多 Shop" <no-reply@nanguado.shop>`;

    if (!host || !port || !user || !pass) {
      this.logger.log(`[Mail Mock] 收件人 ${opts.to}｜主旨 ${opts.subject}`);
      return { sent: false };
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      this.logger.log(`[Mail] 已寄送「${opts.subject}」至 ${opts.to}`);
      return { sent: true };
    } catch (err) {
      this.logger.error(`[Mail] 寄送失敗 ${opts.to}:`, err as Error);
      return { sent: false };
    }
  }
}
