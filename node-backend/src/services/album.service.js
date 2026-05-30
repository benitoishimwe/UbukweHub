'use strict';

const crypto = require('crypto');
const path = require('path');
const archiver = require('archiver');
const QRCode = require('qrcode');
const prisma = require('../config/prisma');
const { uploadFile, deleteFile, getPublicUrl } = require('../config/supabase');
const { AppError } = require('../middleware/errorHandler');

const STORAGE_BUCKET = 'albums';

/**
 * List albums for a tenant with optional event filter.
 *
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} [params.eventId]
 * @param {number} [params.page=1]
 * @param {number} [params.size=20]
 */
async function listAlbums({ tenantId, eventId, page = 1, size = 20 }) {
  const skip = (page - 1) * size;
  // Only include tenantId in the filter when it is provided — self-serve clients
  // (no tenant) are scoped by eventId alone to avoid matching all null-tenant albums.
  const where = tenantId ? { tenantId } : {};
  if (eventId) where.eventId = eventId;

  const [albums, total] = await Promise.all([
    prisma.album.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { media: true } },
      },
    }),
    prisma.album.count({ where }),
  ]);

  return {
    data: albums,
    meta: { total, page, size, totalPages: Math.ceil(total / size) },
  };
}

/**
 * Get a single album by ID, verified against tenant.
 *
 * @param {string} albumId
 * @param {string} tenantId
 */
async function getAlbumById(albumId, tenantId) {
  const album = await prisma.album.findUnique({ where: { albumId } });
  if (!album) throw new AppError('Album not found', 404, 'ALBUM_NOT_FOUND');
  // tenantId=null means caller is a self-serve client; only block mismatched tenant IDs
  if (tenantId && album.tenantId !== tenantId) throw new AppError('Album not found', 404, 'ALBUM_NOT_FOUND');
  if (!tenantId && album.tenantId) throw new AppError('Album not found', 404, 'ALBUM_NOT_FOUND');
  return album;
}

/**
 * Get an album by its public token (no tenant check).
 *
 * @param {string} token
 */
async function getAlbumByToken(token) {
  const album = await prisma.album.findUnique({
    where: { token },
    include: { _count: { select: { media: true } } },
  });
  if (!album || !album.isActive) throw new AppError('Album not found or inactive', 404, 'ALBUM_NOT_FOUND');
  return album;
}

/**
 * Create a new album with a randomly generated public token.
 *
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} params.eventId
 * @param {string} params.title
 * @param {string} [params.description]
 * @param {number} [params.maxFileSizeMb=50]
 * @param {boolean} [params.allowVideos=true]
 * @param {string} [params.createdBy]
 */
async function createAlbum({ tenantId, eventId, title, description, maxFileSizeMb = 50, allowVideos = true, createdBy }) {
  const token = crypto.randomBytes(8).toString('hex');

  const album = await prisma.album.create({
    data: {
      tenantId,
      eventId,
      token,
      title,
      description: description || null,
      maxFileSizeMb,
      allowVideos,
      createdBy: createdBy || null,
    },
  });

  return album;
}

/**
 * Update album metadata.
 *
 * @param {string} albumId
 * @param {string} tenantId
 * @param {object} updates
 */
async function updateAlbum(albumId, tenantId, updates) {
  const album = await prisma.album.findUnique({ where: { albumId } });
  if (!album) throw new AppError('Album not found', 404, 'ALBUM_NOT_FOUND');
  if (tenantId && album.tenantId !== tenantId) throw new AppError('Album not found', 404, 'ALBUM_NOT_FOUND');
  if (!tenantId && album.tenantId) throw new AppError('Album not found', 404, 'ALBUM_NOT_FOUND');

  const allowed = ['title', 'description', 'isActive', 'maxFileSizeMb', 'allowVideos'];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  return prisma.album.update({ where: { albumId }, data });
}

/**
 * Delete an album, removing all associated media from Supabase Storage first.
 *
 * @param {string} albumId
 * @param {string} tenantId
 */
async function deleteAlbum(albumId, tenantId) {
  const album = await prisma.album.findUnique({
    where: { albumId },
    include: { media: true },
  });
  if (!album) throw new AppError('Album not found', 404, 'ALBUM_NOT_FOUND');
  if (tenantId && album.tenantId !== tenantId) throw new AppError('Album not found', 404, 'ALBUM_NOT_FOUND');
  if (!tenantId && album.tenantId) throw new AppError('Album not found', 404, 'ALBUM_NOT_FOUND');

  // Clean up all files from storage
  for (const media of album.media) {
    try {
      const storagePath = `${albumId}/${media.fileName}`;
      await deleteFile(STORAGE_BUCKET, storagePath);
    } catch {
      // Best-effort cleanup — continue even if a file is already gone
    }
  }

  await prisma.albumMedia.deleteMany({ where: { albumId } });
  await prisma.album.delete({ where: { albumId } });
}

/**
 * Upload a file to an album, resolving the album by token or albumId.
 *
 * @param {object} params
 * @param {string} [params.albumId]
 * @param {string} [params.token]
 * @param {Express.Multer.File} params.file
 * @param {string} [params.uploaderName]
 */
async function uploadMedia({ albumId, token, file, uploaderName }) {
  let album;
  if (token) {
    album = await getAlbumByToken(token);
  } else if (albumId) {
    album = await prisma.album.findUnique({ where: { albumId } });
    if (!album || !album.isActive) throw new AppError('Album not found or inactive', 404, 'ALBUM_NOT_FOUND');
  } else {
    throw new AppError('albumId or token is required', 400, 'MISSING_ALBUM_IDENTIFIER');
  }

  const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';

  if (mediaType === 'video' && !album.allowVideos) {
    throw new AppError('This album does not allow video uploads', 400, 'VIDEOS_NOT_ALLOWED');
  }

  const maxBytes = album.maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new AppError(`File exceeds the ${album.maxFileSizeMb} MB limit for this album`, 400, 'FILE_TOO_LARGE');
  }

  const ext = path.extname(file.originalname) || '';
  const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  const storagePath = `${album.albumId}/${uniqueName}`;

  const fileUrl = await uploadFile(STORAGE_BUCKET, storagePath, file.buffer, file.mimetype);

  const media = await prisma.albumMedia.create({
    data: {
      albumId: album.albumId,
      fileName: uniqueName,
      originalName: file.originalname,
      fileType: file.mimetype,
      mediaType,
      fileSize: BigInt(file.size),
      fileUrl,
      uploaderName: uploaderName || null,
    },
  });

  return { ...media, fileSize: media.fileSize.toString() };
}

/**
 * List media for an album with optional favorites filter.
 *
 * @param {object} params
 * @param {string} params.albumId
 * @param {number} [params.page=1]
 * @param {number} [params.size=50]
 * @param {boolean} [params.favoritesOnly=false]
 */
async function listMedia({ albumId, page = 1, size = 50, favoritesOnly = false }) {
  const skip = (page - 1) * size;
  const where = { albumId };
  if (favoritesOnly) where.isFavorite = true;

  const [media, total] = await Promise.all([
    prisma.albumMedia.findMany({
      where,
      skip,
      take: size,
      orderBy: { uploadedAt: 'desc' },
    }),
    prisma.albumMedia.count({ where }),
  ]);

  return {
    data: media.map((m) => ({ ...m, fileSize: m.fileSize.toString() })),
    meta: { total, page, size, totalPages: Math.ceil(total / size) },
  };
}

/**
 * Toggle the isFavorite flag for a media item.
 *
 * @param {string} mediaId
 * @param {string} albumId
 */
async function toggleMediaFavorite(mediaId, albumId) {
  const media = await prisma.albumMedia.findUnique({ where: { mediaId } });
  if (!media || media.albumId !== albumId) {
    throw new AppError('Media not found', 404, 'MEDIA_NOT_FOUND');
  }

  return prisma.albumMedia.update({
    where: { mediaId },
    data: { isFavorite: !media.isFavorite },
  });
}

/**
 * Delete a single media item from both Supabase Storage and the database.
 *
 * @param {string} mediaId
 * @param {string} albumId
 * @param {string} tenantId
 */
async function deleteMedia(mediaId, albumId, tenantId) {
  const media = await prisma.albumMedia.findUnique({
    where: { mediaId },
    include: { album: true },
  });
  if (!media || media.albumId !== albumId) {
    throw new AppError('Media not found', 404, 'MEDIA_NOT_FOUND');
  }
  if (tenantId && media.album.tenantId !== tenantId) {
    throw new AppError('Media not found', 404, 'MEDIA_NOT_FOUND');
  }
  if (!tenantId && media.album.tenantId) {
    throw new AppError('Media not found', 404, 'MEDIA_NOT_FOUND');
  }

  try {
    await deleteFile(STORAGE_BUCKET, `${albumId}/${media.fileName}`);
  } catch {
    // Best-effort
  }

  await prisma.albumMedia.delete({ where: { mediaId } });
}

/**
 * Generate a QR code PNG buffer linking to the album's public upload page.
 *
 * @param {string} albumId
 * @param {string} tenantId
 * @param {string} frontendUrl
 * @returns {Promise<Buffer>}
 */
async function generateAlbumQrCode(albumId, tenantId, frontendUrl) {
  const album = await getAlbumById(albumId, tenantId);
  const url = `${frontendUrl}/upload/${album.token}`;
  return QRCode.toBuffer(url, { type: 'png', width: 400, margin: 2 });
}

/**
 * Stream a ZIP archive of all album media to the response object.
 * Each file is fetched from Supabase storage and streamed into the archive.
 *
 * @param {string} albumId
 * @param {string} tenantId
 * @param {import('express').Response} res
 */
async function downloadZip(albumId, tenantId, res) {
  const album = await getAlbumById(albumId, tenantId);

  const allMedia = await prisma.albumMedia.findMany({
    where: { albumId: album.albumId },
    orderBy: { uploadedAt: 'asc' },
  });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="album-${albumId}.zip"`);

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', (err) => {
    throw new AppError(`Archive error: ${err.message}`, 500, 'ARCHIVE_ERROR');
  });

  archive.pipe(res);

  for (const media of allMedia) {
    const storagePath = `${albumId}/${media.fileName}`;
    // Fetch raw file bytes from Supabase
    const { supabase } = require('../config/supabase');
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
    if (error || !data) continue;
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    archive.append(buffer, { name: media.originalName });
  }

  await archive.finalize();
}

module.exports = {
  listAlbums,
  getAlbumById,
  getAlbumByToken,
  createAlbum,
  updateAlbum,
  deleteAlbum,
  uploadMedia,
  listMedia,
  toggleMediaFavorite,
  deleteMedia,
  generateAlbumQrCode,
  downloadZip,
};
