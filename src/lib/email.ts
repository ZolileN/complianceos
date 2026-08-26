import { getResend } from '@/lib/resend-client';

const FROM_EMAIL = 'PraxisOne <no-reply@praxis.mlkcomputer.com>';
const LOGO_URL = 'https://praxis.mlkcomputer.com/images/praxisone-logo.png';

/** Shared branded header for all PraxisOne emails (table layout for Gmail/Outlook). */
const EMAIL_HEADER = `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
    <tr>
      <td style="vertical-align: middle; padding-right: 10px;">
        <img src="${LOGO_URL}" alt="PraxisOne" width="36" height="36" style="display: block; width: 36px; height: 36px;" />
      </td>
      <td style="vertical-align: middle; font-family: sans-serif; font-size: 18px; font-weight: 700; letter-spacing: -0.03em; color: #ffffff;">
        Praxis<span style="color: #5EEAD4;">One</span>
      </td>
    </tr>
  </table>
`;

function emailShell(title: string, body: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #e2e8f0; background-color: #000000; padding: 40px; border-radius: 8px; border: 1px solid #1f1f1f;">
      ${EMAIL_HEADER}
      <h2 style="color: #ffffff; margin-top: 0;">${title}</h2>
      ${body}
      <hr style="border: none; border-top: 1px solid #1f1f1f; margin-top: 40px;" />
      <p style="font-size: 0.8em; color: #64748b;">&copy; ${new Date().getFullYear()} PraxisOne. All rights reserved.</p>
    </div>
  `;
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping password reset email');
    return { success: false, error: 'Email not configured' };
  }
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset your PraxisOne Password',
      html: emailShell(
        'Password Reset Request',
        `
          <p>We received a request to reset the password for your PraxisOne account.</p>
          <p>Please click the button below to choose a new password:</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" target="_blank" style="background-color: #ffffff; color: #000000; font-family: sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block; cursor: pointer; border: 1px solid #333;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 0.9em; color: #666;">This link will expire in 1 hour.</p>
          <p style="font-size: 0.9em; color: #666;">If you didn't request this, you can safely ignore this email.</p>
        `
      ),
    });
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error };
  }
}

export async function sendRenewalEmail(
  email: string,
  opts: {
    firmName: string;
    planName: string;
    amountZar: string;
    periodEnd: Date;
    payUrl: string;
  }
) {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping renewal email');
    return { success: false, error: 'Email not configured' };
  }
  try {
    const endDate = opts.periodEnd.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your PraxisOne ${opts.planName} plan renews soon`,
      html: emailShell(
        'Time to renew your subscription',
        `
          <p>Hello ${opts.firmName},</p>
          <p>Your PraxisOne <strong>${opts.planName}</strong> plan (R${opts.amountZar}/month) is paid up until <strong>${endDate}</strong>.</p>
          <p>To keep your workspace active without interruption, please complete your renewal payment:</p>
          <div style="margin: 30px 0;">
            <a href="${opts.payUrl}" target="_blank" style="background-color: #ffffff; color: #000000; font-family: sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block; cursor: pointer; border: 1px solid #333;">
              Renew now — R${opts.amountZar}
            </a>
          </div>
          <p style="font-size: 0.9em; color: #666;">If payment isn't received, your workspace becomes read-only 7 days after the period ends.</p>
        `
      ),
    });
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send renewal email:', error);
    return { success: false, error };
  }
}

export async function sendTeamInviteEmail(
  email: string,
  name: string,
  role: string,
  inviteUrl: string
) {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping team invite email');
    return { success: false, error: 'Email not configured' };
  }
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'You have been invited to join PraxisOne',
      html: emailShell(
        'Welcome to PraxisOne!',
        `
          <p>Hello ${name},</p>
          <p>You have been invited to join your firm's workspace on PraxisOne as a <strong>${role.replace('_', ' ')}</strong>.</p>
          <p>Please click the button below to accept the invitation and securely set your password:</p>
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" target="_blank" style="background-color: #ffffff; color: #000000; font-family: sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block; cursor: pointer; border: 1px solid #333;">
              Accept Invitation & Set Password
            </a>
          </div>
          <p style="font-size: 0.9em; color: #666;">This link will expire in 48 hours.</p>
        `
      ),
    });
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send team invite email:', error);
    return { success: false, error };
  }
}

/** Compliance deadline alert emailed to staff (deduped per day via caller). */
export async function sendComplianceAlertEmail(
  email: string,
  opts: {
    title: string;
    message: string;
    actionUrl: string;
    severity: 'warning' | 'error';
  }
) {
  const resend = getResend();
  if (!resend) return { success: false, error: 'Email not configured' };

  const accent = opts.severity === 'error' ? '#ef4444' : '#f59e0b';
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `[PraxisOne] ${opts.title}`,
      html: emailShell(
        opts.title,
        `
          <p style="border-left: 4px solid ${accent}; padding-left: 12px;">${opts.message}</p>
          <div style="margin: 30px 0;">
            <a href="${opts.actionUrl}" target="_blank" style="background-color: #ffffff; color: #000000; font-family: sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
              View in PraxisOne
            </a>
          </div>
        `
      ),
    });
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send compliance alert email:', error);
    return { success: false, error };
  }
}

/** Scheduled compliance portfolio report with CSV + PDF attachments. */
export async function sendComplianceReportEmail(
  email: string,
  opts: {
    tenantName: string;
    dateLabel: string;
    itemCount: number;
    criticalCount: number;
    csvContent: string;
    pdfBuffer: Buffer;
  }
) {
  const resend = getResend();
  if (!resend) return { success: false, error: 'Email not configured' };

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `[PraxisOne] Weekly compliance report — ${opts.tenantName}`,
      html: emailShell(
        'Weekly compliance report',
        `
          <p>Your scheduled compliance portfolio report for <strong>${opts.tenantName}</strong> is attached.</p>
          <p>Report date: ${opts.dateLabel}</p>
          <ul>
            <li>Total obligations: ${opts.itemCount}</li>
            <li>Critical items: ${opts.criticalCount}</li>
          </ul>
          <p style="font-size: 0.9em; color: #666;">CSV and PDF exports are attached for your records.</p>
        `
      ),
      attachments: [
        {
          filename: `compliance-report-${opts.dateLabel}.csv`,
          content: Buffer.from(opts.csvContent, 'utf8'),
        },
        {
          filename: `compliance-report-${opts.dateLabel}.pdf`,
          content: opts.pdfBuffer,
        },
      ],
    });
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send compliance report email:', error);
    return { success: false, error };
  }
}

export async function sendMandateSignRequestEmail(
  email: string,
  opts: { clientName: string; mandateTitle: string; signUrl: string; expiresAt?: Date }
) {
  const resend = getResend();
  if (!resend) return { success: false, error: 'Email not configured' };

  const expiry = opts.expiresAt
    ? opts.expiresAt.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Signature requested: ${opts.mandateTitle}`,
      html: emailShell(
        'Mandate signature requested',
        `
          <p>A mandate for <strong>${opts.clientName}</strong> requires your signature.</p>
          <p><strong>${opts.mandateTitle}</strong></p>
          ${expiry ? `<p style="font-size: 0.9em; color: #666;">This link expires on ${expiry}.</p>` : ''}
          <div style="margin: 30px 0;">
            <a href="${opts.signUrl}" target="_blank" style="background-color: #ffffff; color: #000000; font-family: sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
              Review & Sign
            </a>
          </div>
        `
      ),
    });
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send mandate sign request:', error);
    return { success: false, error };
  }
}
