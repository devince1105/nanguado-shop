import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /**
   * 寄信。優先使用 Resend HTTP API（走 443，避免雲端主機封鎖 SMTP port 造成逾時）；
   * 其次退回 SMTP；都沒有則印 log。任何失敗都不丟錯，避免影響主流程。
   */
  async sendMail(opts: { to: string; subject: string; html: string }) {
    const from = process.env.SMTP_FROM || `南瓜多 本舖 <no-reply@nanguado.shop>`;

    // Resend API 金鑰：可用專屬變數，或沿用 SMTP_PASS（re_ 開頭）
    const resendKey =
      process.env.RESEND_API_KEY ||
      (process.env.SMTP_PASS?.startsWith("re_")
        ? process.env.SMTP_PASS
        : undefined);

    if (resendKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [opts.to],
            subject: opts.subject,
            html: opts.html,
          }),
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          this.logger.error(`[Mail] Resend API 失敗 ${res.status}: ${body}`);
          return { sent: false };
        }
        this.logger.log(
          `[Mail] 已寄送「${opts.subject}」至 ${opts.to}（Resend API）`,
        );
        return { sent: true };
      } catch (err) {
        this.logger.error(`[Mail] Resend API 例外`, err as Error);
        return { sent: false };
      }
    }

    // 退回 SMTP（有設定 host/port/user/pass 時）
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT)
      : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && port && user && pass) {
      try {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        });
        await transporter.sendMail({
          from,
          to: opts.to,
          subject: opts.subject,
          html: opts.html,
        });
        this.logger.log(`[Mail] 已寄送「${opts.subject}」至 ${opts.to}（SMTP）`);
        return { sent: true };
      } catch (err) {
        this.logger.error(`[Mail] SMTP 寄送失敗 ${opts.to}:`, err as Error);
        return { sent: false };
      }
    }

    this.logger.log(`[Mail Mock] 收件人 ${opts.to}｜主旨 ${opts.subject}`);
    return { sent: false };
  }
}
