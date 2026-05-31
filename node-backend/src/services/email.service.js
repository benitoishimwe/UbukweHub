'use strict';

const { Resend } = require('resend');
const config = require('../config/env');

// Detect placeholder / missing API key so we degrade gracefully in dev
const apiKey = config.resend.apiKey;
const isResendConfigured = apiKey && apiKey.length > 10 && !apiKey.startsWith('re_...');

const resend = isResendConfigured ? new Resend(apiKey) : null;
const FROM = `${config.resend.fromName} <${config.resend.fromEmail}>`;

function warnUnconfigured(to) {
  console.warn(`[email.service] Resend is not configured — skipping email to ${to}. Set RESEND_API_KEY in .env to enable emails.`);
}

/** Email-client-safe Plani logo header (no SVG — uses inline HTML). */
function emailLogoHeader() {
  return `
    <div style="text-align:center;padding:24px 0 16px;">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
        <tr>
          <td style="background:#0F4C5C;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
            <span style="color:#E67E22;font-family:Arial,sans-serif;font-weight:900;font-size:20px;line-height:40px;">&#9660;</span>
          </td>
          <td style="padding-left:10px;vertical-align:middle;">
            <span style="font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#0F4C5C;letter-spacing:-0.5px;">Plani</span>
          </td>
        </tr>
      </table>
    </div>
  `;
}

const EMAIL_FOOTER = `
  <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px;text-align:center;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} Plani. All rights reserved.</p>
    <p style="color:#9ca3af;font-size:11px;margin:4px 0 0;">
      <a href="https://plani.pro" style="color:#9ca3af;text-decoration:none;">plani.pro</a>
    </p>
  </div>
`;

/**
 * Send a 6-digit OTP code to a user's email address for MFA verification.
 *
 * @param {string} to   - Recipient email address
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<void>}
 */
async function sendEmailOtp(to, code) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Plani verification code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:0 24px 32px;background:#ffffff;border-radius:8px;">
        ${emailLogoHeader()}
        <h2 style="color:#0F4C5C;margin-bottom:8px;">Verification Code</h2>
        <p style="color:#555;margin-bottom:24px;">Use the code below to verify your identity. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#f4f4f8;border-radius:6px;padding:20px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#0F4C5C;">
          ${code}
        </div>
        <p style="color:#888;font-size:13px;margin-top:24px;">If you did not request this code, please ignore this email or contact support immediately.</p>
        ${EMAIL_FOOTER}
      </div>
    `,
    text: `Your Plani verification code is: ${code}\n\nIt expires in 10 minutes. If you did not request this code, please ignore this email.`,
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
  if (!isResendConfigured) {
    warnUnconfigured(to);
    console.info(`[email.service] Invitation link for ${to}: ${invitationLink}`);
    return;
  }
  const roleLabel = role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  await resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to join ${tenantName} on Plani`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:0 24px 32px;background:#ffffff;border-radius:8px;">
        ${emailLogoHeader()}
        <h2 style="color:#0F4C5C;margin-bottom:8px;">You're Invited!</h2>
        <p style="color:#555;margin-bottom:16px;">
          <strong>${inviterName}</strong> has invited you to join <strong>${tenantName}</strong> on Plani as a <strong>${roleLabel}</strong>.
        </p>
        <p style="color:#555;margin-bottom:24px;">Click the button below to accept the invitation and set up your account. The link expires in <strong>48 hours</strong>.</p>
        <a href="${invitationLink}"
           style="display:inline-block;padding:12px 28px;background:#0F4C5C;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Accept Invitation
        </a>
        <p style="color:#888;font-size:13px;margin-top:28px;">
          Or copy and paste this link into your browser:<br>
          <a href="${invitationLink}" style="color:#0F4C5C;word-break:break-all;">${invitationLink}</a>
        </p>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">If you did not expect this invitation, you can safely ignore this email.</p>
        ${EMAIL_FOOTER}
      </div>
    `,
    text: `You've been invited to join ${tenantName} on Plani as ${roleLabel}.\n\n${inviterName} sent this invitation.\n\nAccept your invitation here:\n${invitationLink}\n\nThis link expires in 48 hours.`,
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
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to Plani!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:0 24px 32px;background:#ffffff;border-radius:8px;">
        ${emailLogoHeader()}
        <h2 style="color:#0F4C5C;margin-bottom:8px;">Welcome to Plani, ${name}!</h2>
        <p style="color:#555;margin-bottom:16px;">
          We're thrilled to have you on board. Plani helps you plan and manage events beautifully.
        </p>
        <p style="color:#555;margin-bottom:24px;">
          Get started by exploring your dashboard, creating your first event, or inviting your team.
        </p>
        <a href="${config.frontendUrl}/dashboard"
           style="display:inline-block;padding:12px 28px;background:#0F4C5C;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Go to Dashboard
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">
          Need help? Reply to this email or visit our support centre at <a href="https://plani.pro/support" style="color:#0F4C5C;">plani.pro/support</a>
        </p>
        ${EMAIL_FOOTER}
      </div>
    `,
    text: `Welcome to Plani, ${name}!\n\nWe're thrilled to have you on board. Visit your dashboard to get started:\n${config.frontendUrl}/dashboard`,
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
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  const timestamp = new Date().toUTCString();

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Plani password was changed',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Password Changed</h2>
        <p style="color:#555;margin-bottom:16px;">Hi ${name},</p>
        <p style="color:#555;margin-bottom:16px;">
          Your Plani account password was successfully changed on <strong>${timestamp}</strong>.
        </p>
        <p style="color:#c0392b;margin-bottom:24px;">
          <strong>If you did not make this change</strong>, please contact our support team immediately and secure your account.
        </p>
        <a href="${config.frontendUrl}/support"
           style="display:inline-block;padding:12px 28px;background:#c0392b;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Contact Support
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">This is an automated security notification from Plani.</p>
      </div>
    `,
    text: `Hi ${name},\n\nYour Plani account password was changed on ${timestamp}.\n\nIf you did not make this change, contact support immediately:\n${config.frontendUrl}/support`,
  });
}

/**
 * Send a temporary password to a user whose password was reset by an admin.
 *
 * @param {string} to           - Recipient email address
 * @param {string} name         - User's display name
 * @param {string} tempPassword - Plaintext temporary password (shown once)
 * @returns {Promise<void>}
 */
async function sendPasswordReset(to, name, tempPassword) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Plani password has been reset',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Password Reset</h2>
        <p style="color:#555;margin-bottom:16px;">Hi ${name},</p>
        <p style="color:#555;margin-bottom:16px;">An admin has reset your Plani account password. Your temporary password is:</p>
        <div style="background:#f4f4f8;border-radius:6px;padding:16px 20px;text-align:center;font-size:22px;font-weight:700;color:#1a1a2e;letter-spacing:2px;margin-bottom:16px;">
          ${tempPassword}
        </div>
        <p style="color:#c0392b;margin-bottom:24px;"><strong>Please log in and change this password immediately.</strong></p>
        <a href="${config.frontendUrl}/login"
           style="display:inline-block;padding:12px 28px;background:#6c63ff;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Log In Now
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">If you did not expect this, please contact your organisation admin.</p>
      </div>
    `,
    text: `Hi ${name},\n\nAn admin has reset your Plani account password.\n\nTemporary password: ${tempPassword}\n\nPlease log in and change this password immediately:\n${config.frontendUrl}/login`,
  });
}

/**
 * Notify a user that the super admin has granted them a new subscription plan.
 */
async function sendPlanGranted(to, name, plan, grantedByEmail) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your Plani plan has been upgraded to ${planLabel}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Plan Upgraded</h2>
        <p style="color:#555;margin-bottom:16px;">Hi ${name},</p>
        <p style="color:#555;margin-bottom:16px;">Great news! Your Plani account has been upgraded to the <strong>${planLabel}</strong> plan by a platform administrator.</p>
        <div style="background:#f4f4f8;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#c9a84c;">Plan: ${planLabel}</p>
        </div>
        <a href="${config.frontendUrl}/dashboard" style="display:inline-block;padding:12px 28px;background:#c9a84c;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">Go to Dashboard</a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">Questions? Reply to this email or contact ${grantedByEmail}.</p>
      </div>
    `,
    text: `Hi ${name},\n\nYour Plani account has been upgraded to the ${planLabel} plan.\n\nVisit your dashboard:\n${config.frontendUrl}/dashboard`,
  });
}

/**
 * Notify a user that the super admin has granted them a free trial.
 */
async function sendTrialGranted(to, name, plan, trialDays, expiresAt) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : `${trialDays} days`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your ${trialDays}-day ${planLabel} trial on Plani has started`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">Trial Started!</h2>
        <p style="color:#555;margin-bottom:16px;">Hi ${name},</p>
        <p style="color:#555;margin-bottom:16px;">A platform administrator has granted you a <strong>${trialDays}-day trial</strong> of the <strong>${planLabel}</strong> plan. Enjoy full access until <strong>${expiry}</strong>.</p>
        <a href="${config.frontendUrl}/dashboard" style="display:inline-block;padding:12px 28px;background:#c9a84c;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">Start Exploring</a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">After the trial ends your account will revert to the Free plan unless you upgrade.</p>
      </div>
    `,
    text: `Hi ${name},\n\nYou have a ${trialDays}-day ${planLabel} trial until ${expiry}.\n\n${config.frontendUrl}/dashboard`,
  });
}

/**
 * Send a custom support email from the super admin to any user.
 */
async function sendCustomEmail(to, name, subject, message, fromAdminName) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  const safeMessage = String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <p style="color:#555;margin-bottom:8px;">Hi ${name || to},</p>
        <div style="color:#333;line-height:1.7;margin-bottom:24px;">${safeMessage}</div>
        <p style="color:#aaa;font-size:12px;border-top:1px solid #f0f0f0;padding-top:16px;margin-top:24px;">Sent by ${fromAdminName || 'Plani Support'} via Plani platform.</p>
      </div>
    `,
    text: `Hi ${name || to},\n\n${message}\n\n— ${fromAdminName || 'Plani Support'}`,
  });
}

/**
 * Notify a staff member that a task has been assigned to them.
 *
 * @param {string} to            - Recipient email address
 * @param {string} name          - Recipient's display name
 * @param {string} taskTitle     - Title of the assigned task
 * @param {string|null} eventName - Event the task belongs to (optional)
 * @param {string} dashboardLink - Link to the staff dashboard
 */
async function sendTaskAssigned(to, name, taskTitle, eventName, dashboardLink) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  await resend.emails.send({
    from: FROM,
    to,
    subject: `New task assigned: ${taskTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#1a1a2e;margin-bottom:8px;">New Task Assigned</h2>
        <p style="color:#555;margin-bottom:16px;">Hi ${name},</p>
        <p style="color:#555;margin-bottom:8px;">You have been assigned a new task:</p>
        <div style="background:#f4f4f8;border-radius:6px;padding:16px 20px;margin-bottom:16px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#1a1a2e;">${taskTitle}</p>
          ${eventName ? `<p style="margin:6px 0 0;font-size:13px;color:#888;">Event: ${eventName}</p>` : ''}
        </div>
        <p style="color:#555;margin-bottom:24px;">Log in to your dashboard to view details and update your progress.</p>
        <a href="${dashboardLink}"
           style="display:inline-block;padding:12px 28px;background:#c9a84c;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Go to Dashboard
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:32px;">This is an automated notification from Plani. Do not reply to this email.</p>
      </div>
    `,
    text: `Hi ${name},\n\nYou have been assigned a new task: ${taskTitle}${eventName ? `\nEvent: ${eventName}` : ''}\n\nView it on your dashboard:\n${dashboardLink}`,
  });
}

/**
 * Send a test-account invitation email.
 *
 * @param {string} to          - Recipient email address
 * @param {string} name        - Recipient name
 * @param {string} loginUrl    - Direct login URL
 * @param {string} password    - Temporary password
 * @param {string} plan        - Plan granted (e.g. 'pro')
 * @param {string} expiresAt   - ISO date string for expiry
 * @returns {Promise<void>}
 */
async function sendTestAccountInvitation(to, name, loginUrl, password, plan, expiresAt) {
  if (!isResendConfigured) {
    warnUnconfigured(to);
    console.info(`[email.service] Test account credentials for ${to}: ${loginUrl} / ${password}`);
    return;
  }

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const expiry    = new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  await resend.emails.send({
    from: FROM,
    to,
    subject: "You've been invited to test Plani",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#ffffff;border-radius:10px;">
        <div style="text-align:center;margin-bottom:28px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;background:#0F4C5C;">
            <span style="color:#fff;font-weight:800;font-size:20px;font-family:Poppins,sans-serif;">P</span>
          </div>
          <h1 style="font-family:Poppins,sans-serif;color:#111827;margin:12px 0 0;font-size:22px;">Welcome to Plani</h1>
        </div>

        <p style="color:#374151;margin-bottom:8px;">Hi <strong>${name || to}</strong>,</p>
        <p style="color:#374151;margin-bottom:24px;">
          You've been given access to a <strong>${planLabel} test account</strong> on Plani — the all-in-one event planning platform.
          This account is active until <strong>${expiry}</strong>.
        </p>

        <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-weight:600;color:#111827;font-size:14px;">Your login credentials</p>
          <p style="margin:0 0 4px;font-size:13px;color:#374151;"><strong>Email:</strong> ${to}</p>
          <p style="margin:0;font-size:13px;color:#374151;"><strong>Temporary password:</strong> <code style="background:#E5E7EB;padding:2px 6px;border-radius:4px;">${password}</code></p>
        </div>

        <p style="color:#6B7280;font-size:13px;margin-bottom:20px;">
          Please change your password after your first login. This test account grants access to all <strong>${planLabel}</strong> features.
        </p>

        <a href="${loginUrl}"
           style="display:block;text-align:center;padding:14px 28px;background:#0F4C5C;color:#fff;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;margin-bottom:24px;">
          Open Plani &rarr;
        </a>

        <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">
          This is a test account provided by the Plani team. It expires on ${expiry}.<br>
          Questions? Reply to this email.
        </p>
      </div>
    `,
    text: `Hi ${name || to},\n\nYou've been given a ${planLabel} test account on Plani.\n\nEmail: ${to}\nTemporary password: ${password}\n\nLogin: ${loginUrl}\n\nThis account expires on ${expiry}.`,
  });
}

/**
 * Send a 6-digit OTP to a guest for event check-in.
 */
async function sendGuestCheckinOtp(to, code, eventName, expiryMinutes) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your check-in code for ${eventName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#0F4C5C;margin-bottom:8px;">Event Check-in Code</h2>
        <p style="color:#555;margin-bottom:8px;">You are checking in to:</p>
        <p style="color:#0F4C5C;font-weight:700;font-size:18px;margin-bottom:20px;">${eventName}</p>
        <p style="color:#555;margin-bottom:24px;">Enter this code to complete your check-in. It expires in <strong>${expiryMinutes} minutes</strong>.</p>
        <div style="background:#f4f4f8;border-radius:6px;padding:20px;text-align:center;letter-spacing:10px;font-size:36px;font-weight:700;color:#0F4C5C;">
          ${code}
        </div>
        <p style="color:#888;font-size:13px;margin-top:24px;">If you did not request this code, please ignore this email.</p>
      </div>
    `,
    text: `Your check-in code for ${eventName} is: ${code}\n\nIt expires in ${expiryMinutes} minutes.`,
  });
}

/**
 * Confirm to a user that their support ticket was received.
 */
async function sendTicketCreated(to, name, ticketId, subject) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  const displayName = name || to;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `We received your support request: ${subject}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#0F4C5C;margin-bottom:8px;">Support Request Received</h2>
        <p style="color:#555;margin-bottom:16px;">Hi ${displayName},</p>
        <p style="color:#555;margin-bottom:16px;">We have received your support request and our team will respond as soon as possible.</p>
        <div style="background:#f4f4f8;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0 0 6px;font-size:13px;color:#888;">Ticket reference</p>
          <p style="margin:0;font-weight:700;color:#0F4C5C;font-size:15px;">#${ticketId.substring(0, 8).toUpperCase()}</p>
          <p style="margin:6px 0 0;font-size:13px;color:#555;">Subject: ${subject}</p>
        </div>
        <p style="color:#888;font-size:13px;">Reply to this email to add more information to your ticket.</p>
      </div>
    `,
    text: `Hi ${displayName},\n\nWe received your support request.\n\nTicket: #${ticketId.substring(0, 8).toUpperCase()}\nSubject: ${subject}\n\nWe will respond to this email address.`,
  });
}

/**
 * Notify internal support team about a new ticket.
 */
async function sendTicketCreatedInternal(to, { ticketId, email, subject, message }) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  const safeMessage = String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[Support] New ticket: ${subject}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#c0392b;margin-bottom:8px;">New Support Ticket</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr><td style="padding:4px 0;color:#888;font-size:13px;width:100px;">Ticket ID</td><td style="color:#333;font-size:13px;">#${ticketId.substring(0, 8).toUpperCase()}</td></tr>
          <tr><td style="padding:4px 0;color:#888;font-size:13px;">From</td><td style="color:#333;font-size:13px;">${email}</td></tr>
          <tr><td style="padding:4px 0;color:#888;font-size:13px;">Subject</td><td style="color:#333;font-size:13px;font-weight:700;">${subject}</td></tr>
        </table>
        <div style="background:#f9f9f9;border-left:3px solid #c0392b;padding:12px 16px;margin-bottom:16px;color:#333;font-size:14px;line-height:1.6;">
          ${safeMessage}
        </div>
        <p style="color:#aaa;font-size:12px;">Log in to the admin panel to respond to this ticket.</p>
      </div>
    `,
    text: `New support ticket #${ticketId.substring(0, 8).toUpperCase()}\nFrom: ${email}\nSubject: ${subject}\n\n${message}`,
  });
}

/**
 * Send a self-service password reset email with a one-time link.
 *
 * @param {string} to        - Recipient email address
 * @param {string} name      - Recipient display name
 * @param {string} resetLink - Full URL containing the reset token
 * @returns {Promise<void>}
 */
async function sendPasswordResetRequest(to, name, resetLink) {
  if (!isResendConfigured) {
    warnUnconfigured(to);
    console.info(`[email.service] Password reset link for ${to}: ${resetLink}`);
    return;
  }
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Plani password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:0 24px 32px;background:#ffffff;border-radius:8px;">
        ${emailLogoHeader()}
        <h2 style="color:#0F4C5C;margin-bottom:8px;">Reset Your Password</h2>
        <p style="color:#555;margin-bottom:16px;">Hi ${name || 'there'},</p>
        <p style="color:#555;margin-bottom:24px;">
          We received a request to reset the password for your Plani account. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetLink}"
           style="display:inline-block;padding:13px 30px;background:#0F4C5C;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
          Reset Password
        </a>
        <p style="color:#888;font-size:13px;margin-top:28px;">
          Or copy and paste this link:<br>
          <a href="${resetLink}" style="color:#0F4C5C;word-break:break-all;">${resetLink}</a>
        </p>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">
          If you did not request a password reset, you can safely ignore this email — your password will not change.
        </p>
        ${EMAIL_FOOTER}
      </div>
    `,
    text: `Hi ${name || 'there'},\n\nReset your Plani password here:\n${resetLink}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
  });
}

/**
 * Send a vendor invitation email with a link to complete their vendor profile.
 *
 * @param {string} to             - Recipient email address
 * @param {string} inviterName    - Name of the admin sending the invite
 * @param {string} tenantName     - Name of the organisation
 * @param {string} invitationLink - Full URL to the vendor registration page
 * @param {string} [message]      - Optional personal message from the inviter
 * @returns {Promise<void>}
 */
async function sendVendorInvitation(to, inviterName, tenantName, invitationLink, message) {
  if (!isResendConfigured) {
    warnUnconfigured(to);
    console.info(`[email.service] Vendor invitation link for ${to}: ${invitationLink}`);
    return;
  }

  const personalNote = message
    ? `<div style="background:#F9FAFB;border-left:3px solid #C9A84C;padding:12px 16px;margin:16px 0;color:#374151;font-size:14px;font-style:italic;">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`
    : '';

  await resend.emails.send({
    from: FROM,
    to,
    subject: `You're invited to join Plani as a vendor`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:0 24px 32px;background:#ffffff;border-radius:8px;">
        ${emailLogoHeader()}
        <h2 style="color:#0F4C5C;margin-bottom:8px;">Vendor Invitation</h2>
        <p style="color:#555;margin-bottom:16px;">
          <strong>${inviterName}</strong> from <strong>${tenantName}</strong> has invited you to join <strong>Plani</strong> as a vendor and list your services on our marketplace.
        </p>
        ${personalNote}
        <p style="color:#555;margin-bottom:8px;">As a Plani vendor you can:</p>
        <ul style="color:#555;margin:0 0 24px;padding-left:20px;line-height:2;">
          <li>Create a professional profile and showcase your portfolio</li>
          <li>Appear in the Plani vendor marketplace</li>
          <li>Receive event inquiries directly from event planners</li>
        </ul>
        <p style="color:#555;margin-bottom:24px;">Click the button below to set up your vendor profile. The link expires in <strong>7 days</strong>.</p>
        <a href="${invitationLink}"
           style="display:inline-block;padding:13px 30px;background:#C9A84C;color:#fff;border-radius:50px;text-decoration:none;font-weight:700;font-size:15px;">
          Set Up My Vendor Profile
        </a>
        <p style="color:#888;font-size:13px;margin-top:28px;">
          Or copy and paste this link:<br>
          <a href="${invitationLink}" style="color:#0F4C5C;word-break:break-all;">${invitationLink}</a>
        </p>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">If you did not expect this invitation, you can safely ignore this email.</p>
        ${EMAIL_FOOTER}
      </div>
    `,
    text: `You've been invited to join Plani as a vendor by ${inviterName} from ${tenantName}.\n\n${message ? message + '\n\n' : ''}Set up your vendor profile here:\n${invitationLink}\n\nThis link expires in 7 days.`,
  });
}

/**
 * Notify a user that support staff replied to their ticket.
 */
async function sendTicketReply(to, subject, replyMessage, ticketId) {
  if (!isResendConfigured) { warnUnconfigured(to); return; }
  const safeReply = String(replyMessage).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Re: ${subject} [Ticket #${ticketId.substring(0, 8).toUpperCase()}]`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:8px;">
        <h2 style="color:#0F4C5C;margin-bottom:8px;">Support Reply</h2>
        <p style="color:#888;font-size:13px;margin-bottom:20px;">Re: ${subject}</p>
        <div style="background:#f4f4f8;border-radius:6px;padding:16px 20px;margin-bottom:24px;color:#333;font-size:14px;line-height:1.6;">
          ${safeReply}
        </div>
        <p style="color:#555;font-size:13px;">You can reply to this email to continue the conversation.</p>
        <p style="color:#aaa;font-size:12px;margin-top:24px;">Ticket reference: #${ticketId.substring(0, 8).toUpperCase()}</p>
      </div>
    `,
    text: `Support reply to: ${subject}\n\n${replyMessage}\n\n---\nTicket: #${ticketId.substring(0, 8).toUpperCase()}`,
  });
}

module.exports = {
  sendEmailOtp,
  sendInvitation,
  sendVendorInvitation,
  sendPasswordResetRequest,
  sendWelcome,
  sendPasswordChanged,
  sendPasswordReset,
  sendPlanGranted,
  sendTrialGranted,
  sendCustomEmail,
  sendTaskAssigned,
  sendTestAccountInvitation,
  sendGuestCheckinOtp,
  sendTicketCreated,
  sendTicketCreatedInternal,
  sendTicketReply,
};
