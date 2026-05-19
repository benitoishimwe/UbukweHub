'use strict';

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const config = require('./env');

/**
 * Supabase client initialised with the service-role key so that server-side
 * code can bypass Row Level Security when managing storage objects.
 *
 * Usage:
 *   const { supabase, uploadFile, deleteFile, getPublicUrl } = require('./supabase');
 */

if (!config.supabase.url || !config.supabase.serviceKey) {
  console.warn(
    '[supabase] SUPABASE_URL or SUPABASE_SERVICE_KEY is not set. ' +
      'Storage operations will fail at runtime.'
  );
}

const supabase = createClient(
  config.supabase.url || 'https://placeholder.supabase.co',
  config.supabase.serviceKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    realtime: {
      transport: ws,
    },
  }
);

/**
 * Upload a file buffer to Supabase Storage.
 *
 * @param {string} bucket   - Storage bucket name
 * @param {string} path     - Object path inside the bucket (e.g. 'events/abc/photo.jpg')
 * @param {Buffer} buffer   - File contents
 * @param {string} mimeType - MIME type (e.g. 'image/jpeg')
 * @returns {Promise<string>} The public URL of the uploaded file
 */
async function uploadFile(bucket, path, buffer, mimeType) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  return getPublicUrl(bucket, data.path);
}

/**
 * Delete a file from Supabase Storage.
 *
 * @param {string} bucket - Storage bucket name
 * @param {string} path   - Object path inside the bucket
 */
async function deleteFile(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(`Supabase delete failed: ${error.message}`);
  }
}

/**
 * Get the public URL for a stored object.
 *
 * @param {string} bucket - Storage bucket name
 * @param {string} path   - Object path inside the bucket
 * @returns {string} Public URL
 */
function getPublicUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Create a signed (time-limited) download URL.
 *
 * @param {string} bucket      - Storage bucket name
 * @param {string} path        - Object path inside the bucket
 * @param {number} expiresInSeconds - Validity window in seconds (default 3600)
 * @returns {Promise<string>} Signed URL
 */
async function createSignedUrl(bucket, path, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    throw new Error(`Supabase signed URL failed: ${error.message}`);
  }

  return data.signedUrl;
}

module.exports = {
  supabase,
  uploadFile,
  deleteFile,
  getPublicUrl,
  createSignedUrl,
};
