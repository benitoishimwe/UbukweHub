'use strict';

const QRCode = require('qrcode');

/**
 * QR code generation utilities wrapping the `qrcode` library.
 */

/**
 * Generate a QR code PNG image as a Buffer.
 *
 * @param {string} text  - The content to encode (URL, UUID, etc.)
 * @param {object} [opts] - Optional qrcode options (errorCorrectionLevel, margin, etc.)
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateQrCode(text, opts = {}) {
  const options = {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    ...opts,
  };

  return QRCode.toBuffer(text, options);
}

/**
 * Generate a QR code as a base64-encoded data URI (suitable for embedding
 * in HTML <img> tags or JSON API responses).
 *
 * @param {string} text  - The content to encode
 * @param {object} [opts] - Optional qrcode options
 * @returns {Promise<string>} Data URI string — "data:image/png;base64,..."
 */
async function generateQrCodeBase64(text, opts = {}) {
  const options = {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    ...opts,
  };

  return QRCode.toDataURL(text, options);
}

module.exports = {
  generateQrCode,
  generateQrCodeBase64,
};
