import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'PraxisOne <no-reply@praxis.mlkcomputer.com>';

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Reset your PraxisOne Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #e2e8f0; background-color: #000000; padding: 40px; border-radius: 8px; border: 1px solid #1f1f1f;">
          <h2 style="color: #ffffff; margin-top: 0;">Password Reset Request</h2>
          <p>We received a request to reset the password for your PraxisOne account.</p>
          <p>Please click the button below to choose a new password:</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" 
               target="_blank" 
               style="background-color: #ffffff; color: #000000; font-family: sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block; cursor: pointer; border: 1px solid #333;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 0.9em; color: #666;">This link will expire in 1 hour.</p>
          <p style="font-size: 0.9em; color: #666;">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #1f1f1f; margin-top: 40px;" />
          <p style="font-size: 0.8em; color: #64748b;">&copy; ${new Date().getFullYear()} PraxisOne. All rights reserved.</p>
        </div>
      `,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error };
  }
}

export async function sendTeamInviteEmail(email: string, name: string, role: string, inviteUrl: string) {
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'You have been invited to join PraxisOne',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #e2e8f0; background-color: #000000; padding: 40px; border-radius: 8px; border: 1px solid #1f1f1f;">
          <h2 style="color: #ffffff; margin-top: 0;">Welcome to PraxisOne!</h2>
          <p>Hello ${name},</p>
          <p>You have been invited to join your firm's workspace on PraxisOne as a <strong>${role.replace('_', ' ')}</strong>.</p>
          <p>Please click the button below to accept the invitation and securely set your password:</p>
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" 
               target="_blank" 
               style="background-color: #ffffff; color: #000000; font-family: sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block; cursor: pointer; border: 1px solid #333;">
              Accept Invitation & Set Password
            </a>
          </div>
          <p style="font-size: 0.9em; color: #666;">This link will expire in 48 hours.</p>
          <hr style="border: none; border-top: 1px solid #1f1f1f; margin-top: 40px;" />
          <p style="font-size: 0.8em; color: #64748b;">&copy; ${new Date().getFullYear()} PraxisOne. All rights reserved.</p>
        </div>
      `,
    });
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send team invite email:', error);
    return { success: false, error };
  }
}
