import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'PraxisOne <no-reply@praxis.mlkcomputer.com>';

export type InquiryType = 'demo' | 'sales';

export type InquiryInput = {
  name: string;
  email: string;
  company: string;
  message: string;
};

function getInbox(type: InquiryType) {
  if (type === 'demo') {
    return process.env.BOOK_DEMO_EMAIL?.trim() || '';
  }
  return process.env.CONTACT_SALES_EMAIL?.trim() || '';
}

export async function sendInquiryEmail(type: InquiryType, input: InquiryInput) {
  const inbox = getInbox(type);
  if (!process.env.RESEND_API_KEY || !inbox) {
    throw new Error(`${type === 'demo' ? 'Book demo' : 'Contact sales'} is not configured`);
  }

  const subject =
    type === 'demo'
      ? `PraxisOne demo request — ${input.company}`
      : `PraxisOne sales inquiry — ${input.company}`;

  const heading = type === 'demo' ? 'New demo request' : 'New sales inquiry';
  const intro =
    type === 'demo'
      ? 'Someone requested a PraxisOne product walkthrough from the landing page.'
      : 'Someone requested Enterprise pricing / sales follow-up from the landing page.';
  const ctaLabel = type === 'demo' ? 'Reply to schedule demo' : 'Reply to sales inquiry';
  const safeName = escapeHtml(input.name);
  const safeEmail = escapeHtml(input.email);
  const safeCompany = escapeHtml(input.company);
  const safeMessage = escapeHtml(input.message);
  const mailto = `mailto:${encodeURIComponent(input.email)}?subject=${encodeURIComponent(`Re: ${subject}`)}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #e2e8f0; background-color: #000000; padding: 40px; border-radius: 8px; border: 1px solid #1f1f1f;">
      <h2 style="color: #ffffff; margin-top: 0;">${heading}</h2>
      <p style="color: #e2e8f0; line-height: 1.5;">${intro}</p>

      <table style="width: 100%; border-collapse: collapse; margin: 28px 0; font-size: 14px;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #1f1f1f; color: #64748b; width: 120px; vertical-align: top;">Name</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #1f1f1f; color: #ffffff; vertical-align: top;">${safeName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #1f1f1f; color: #64748b; vertical-align: top;">Email</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #1f1f1f; vertical-align: top;">
            <a href="mailto:${safeEmail}" style="color: #5eead4; text-decoration: none;">${safeEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #1f1f1f; color: #64748b; vertical-align: top;">Company</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #1f1f1f; color: #ffffff; vertical-align: top;">${safeCompany}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #1f1f1f; color: #64748b; vertical-align: top;">Message</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #1f1f1f; color: #e2e8f0; white-space: pre-wrap; vertical-align: top;">${safeMessage}</td>
        </tr>
      </table>

      <div style="margin: 30px 0;">
        <a href="${mailto}"
           style="background-color: #ffffff; color: #000000; font-family: sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block; cursor: pointer; border: 1px solid #333;">
          ${ctaLabel}
        </a>
      </div>

      <p style="font-size: 0.9em; color: #666;">Reply-to is set to the requester&apos;s email.</p>
      <hr style="border: none; border-top: 1px solid #1f1f1f; margin-top: 40px;" />
      <p style="font-size: 0.8em; color: #64748b;">&copy; ${new Date().getFullYear()} PraxisOne. All rights reserved.</p>
    </div>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: inbox,
      replyTo: input.email,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error(`Failed to send ${type} inquiry email:`, error);
    return { success: false, error };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
