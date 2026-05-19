'use strict';

const { Resend } = require('resend');
const config = require('../config/env');

const resend = new Resend(config.resend.apiKey);
const FROM = `${config.resend.fromName} <${config.resend.fromEmail}>`;

/**
 * Send a 6-digit OTP code to a user's email address for MFA verification.
 *
 * @param {string} to   - Recipient email address
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<void>}
 */
async function sendEmailOtp(to, code) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Prani verification code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Verification Code</h2>
        <p style="color:#555;margin-bottom:24px;">Use the code below to verify your identity. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#f4f4f8;border-radius:6px;padding:20px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#1a1a2e;">
          ${code}
        </div>
        <p style="color:#888;font-size:13px;margin-top:24px;">If you did not request this code, please ignore this email or contact support immediately.</p>
      </div>
    `,
    text: `Your Prani verification code is: ${code}\n\nIt expires in 10 minutes. If you did not request this code, please ignore this email.`,
  });
}

/**
 * Send a team invitation email with a sign-up link.
 *
 * @param {string} to             - Recipient email address
 * @param {string} inviterName    - Name of the person sending the invite
 * @param {string} tenantName     - Name of the organisation
 * @param {string} role           - Role the invitee will receive
 * @param {string} invitationLink - Full URL to the invitation acceptance page
 * @returns {Promise<void>}
 */
async function sendInvitation(to, inviterName, tenantName, role, invitationLink) {
  const roleLabel = role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  await resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to join ${tenantName} on Prani`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">You're Invited!</h2>
        <p style="color:#555;margin-bottom:16px;">
          <strong>${inviterName}</strong> has invited you to join <strong>${tenantName}</strong> on Prani as a <strong>${roleLabel}</strong>.
        </p>
        <p style="color:#555;margin-bottom:24px;">Click the button below to accept the invitation and set up your account. The link expires in <strong>48 hours</strong>.</p>
        <a href="${invitationLink}"
           style="display:inline-block;padding:12px 28px;background:#6c63ff;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Accept Invitation
        </a>
        <p style="color:#888;font-size:13px;margin-top:28px;">
          Or copy and paste this link into your browser:<br>
          <a href="${invitationLink}" style="color:#6c63ff;word-break:break-all;">${invitationLink}</a>
        </p>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">If you did not expect this invitation, you can safely ignore this email.</p>
      </div>
    `,
    text: `You've been invited to join ${tenantName} on Prani as ${roleLabel}.\n\n${inviterName} sent this invitation.\n\nAccept your invitation here:\n${invitationLink}\n\nThis link expires in 48 hours.`,
  });
}

/**
 * Send a welcome email after a user completes registration.
 *
 * @param {string} to   - Recipient email address
 * @param {string} name - User's display name
 * @returns {Promise<void>}
 */
async function sendWelcome(to, name) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to Prani!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Welcome to Prani, ${name}!</h2>
        <p style="color:#555;margin-bottom:16px;">
          We're thrilled to have you on board. Prani helps you plan and manage events beautifully.
        </p>
        <p style="color:#555;margin-bottom:24px;">
          Get started by exploring your dashboard, creating your first event, or inviting your team.
        </p>
        <a href="${config.frontendUrl}/dashboard"
           style="display:inline-block;padding:12px 28px;background:#6c63ff;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Go to Dashboard
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">
          Need help? Reply to this email or visit our support centre.
        </p>
      </div>
    `,
    text: `Welcome to Prani, ${name}!\n\nWe're thrilled to have you on board. Visit your dashboard to get started:\n${config.frontendUrl}/dashboard`,
  });
}

/**
 * Send a security notification email when a user's password changes.
 *
 * @param {string} to   - Recipient email address
 * @param {string} name - User's display name
 * @returns {Promise<void>}
 */
async function sendPasswordChanged(to, name) {
  const timestamp = new Date().toUTCString();

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Prani password was changed',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Password Changed</h2>
        <p style="color:#555;margin-bottom:16px;">Hi ${name},</p>
        <p style="color:#555;margin-bottom:16px;">
          Your Prani account password was successfully changed on <strong>${timestamp}</strong>.
        </p>
        <p style="color:#c0392b;margin-bottom:24px;">
          <strong>If you did not make this change</strong>, please contact our support team immediately and secure your account.
        </p>
        <a href="${config.frontendUrl}/support"
           style="display:inline-block;padding:12px 28px;background:#c0392b;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Contact Support
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">This is an automated security notification from Prani.</p>
      </div>
    `,
    text: `Hi ${name},\n\nYour Prani account password was changed on ${timestamp}.\n\nIf you did not make this change, contact support immediately:\n${config.frontendUrl}/support`,
  });
}

module.exports = {
  sendEmailOtp,
  sendInvitation,
  sendWelcome,
  sendPasswordChanged,
};
