'use strict';

const { authenticator } = require('otplib');

/**
 * TOTP / OTP utilities built on top of otplib.
 */

// otplib defaults: 30-second window, SHA-1, 6 digits — standard TOTP (RFC 6238).
// Allow 1 step of clock drift tolerance (±30 s).
authenticator.options = { window: 1 };

/**
 * Generate a new random base32 TOTP secret.
 *
 * @returns {string} Base32 secret (e.g. "JBSWY3DPEHPK3PXP")
 */
function generateSecret() {
  return authenticator.generateSecret(20); // 20 bytes → 32-char base32
}

/**
 * Build the otpauth:// URI used to generate QR codes for authenticator apps.
 *
 * @param {string} email   - Account label shown in the authenticator app
 * @param {string} secret  - Base32 TOTP secret
 * @param {string} issuer  - App / service name (e.g. "Prani")
 * @returns {string} otpauth URI
 */
function generateQrUri(email, secret, issuer = 'Prani') {
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Verify a 6-digit TOTP token against the stored secret.
 *
 * @param {string} secret - Base32 TOTP secret stored for the user
 * @param {string} token  - 6-digit code entered by the user
 * @returns {boolean}
 */
function verify(secret, token) {
  try {
    return authenticator.verify({ token: String(token), secret });
  } catch {
    // Invalid token format → treat as failed verification
    return false;
  }
}

/**
 * Generate a random 6-digit numeric OTP for email-based MFA.
 *
 * @returns {string} Zero-padded 6-digit string (e.g. "047382")
 */
function generateEmailOtp() {
  const otp = Math.floor(Math.random() * 1_000_000);
  return otp.toString().padStart(6, '0');
}

module.exports = {
  generateSecret,
  generateQrUri,
  verify,
  generateEmailOtp,
};
