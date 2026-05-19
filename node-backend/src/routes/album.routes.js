'use strict';

const { Router } = require('express');
const multer = require('multer');
const albumService = require('../services/album.service');
const { authenticate } = require('../middleware/auth');
const R = require('../utils/response');
const config = require('../config/env');

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB hard cap
});

// ─── GET / — list albums ──────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const { eventId, page, size } = req.query;
    const result = await albumService.listAlbums({
      tenantId,
      eventId: eventId || undefined,
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 20,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST / — create album ────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const { eventId, title, description, maxFileSizeMb, allowVideos } = req.body;
    if (!eventId) return R.badRequest(res, 'eventId is required');
    if (!title) return R.badRequest(res, 'title is required');

    const album = await albumService.createAlbum({
      tenantId,
      eventId,
      title,
      description,
      maxFileSizeMb: maxFileSizeMb !== undefined ? parseInt(maxFileSizeMb, 10) : 50,
      allowVideos: allowVideos !== undefined ? allowVideos === true || allowVideos === 'true' : true,
      createdBy: req.user.userId,
    });

    return R.created(res, album, 'Album created successfully');
  } catch (err) {
    next(err);
  }
});

// ─── GET /public/:token — get album by token (public) ────────────────────────
router.get('/public/:token', async (req, res, next) => {
  try {
    const album = await albumService.getAlbumByToken(req.params.token);
    return R.ok(res, album);
  } catch (err) {
    next(err);
  }
});

// ─── POST /public/:token/upload — guest upload via token (public) ─────────────
router.post('/public/:token/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return R.badRequest(res, 'File is required');

    const media = await albumService.uploadMedia({
      token: req.params.token,
      file: req.file,
      uploaderName: req.body.uploaderName || null,
    });

    return R.created(res, media, 'File uploaded successfully');
  } catch (err) {
    next(err);
  }
});

// ─── GET /:albumId — get album ────────────────────────────────────────────────
router.get('/:albumId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const album = await albumService.getAlbumById(req.params.albumId, tenantId);
    return R.ok(res, album);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /:albumId — update album ──────────────────────────────────────────
router.patch('/:albumId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const album = await albumService.updateAlbum(req.params.albumId, tenantId, req.body);
    return R.ok(res, album, 'Album updated');
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:albumId — delete album ──────────────────────────────────────────
router.delete('/:albumId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    await albumService.deleteAlbum(req.params.albumId, tenantId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:albumId/media — list media ────────────────────────────────────────
router.get('/:albumId/media', authenticate, async (req, res, next) => {
  try {
    const { page, size, favoritesOnly } = req.query;
    const result = await albumService.listMedia({
      albumId: req.params.albumId,
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 50,
      favoritesOnly: favoritesOnly === 'true',
    });
    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /:albumId/media — upload media ─────────────────────────────────────
router.post('/:albumId/media', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return R.badRequest(res, 'File is required');

    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const media = await albumService.uploadMedia({
      albumId: req.params.albumId,
      file: req.file,
      uploaderName: req.body.uploaderName || req.user.userId,
    });

    return R.created(res, media, 'File uploaded successfully');
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:albumId/media/:mediaId — delete media ──────────────────────────
router.delete('/:albumId/media/:mediaId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    await albumService.deleteMedia(req.params.mediaId, req.params.albumId, tenantId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

// ─── POST /:albumId/media/:mediaId/favorite — toggle favorite ────────────────
router.post('/:albumId/media/:mediaId/favorite', authenticate, async (req, res, next) => {
  try {
    const media = await albumService.toggleMediaFavorite(req.params.mediaId, req.params.albumId);
    return R.ok(res, media, media.isFavorite ? 'Marked as favorite' : 'Removed from favorites');
  } catch (err) {
    next(err);
  }
});

// ─── GET /:albumId/qrcode — download QR code PNG ─────────────────────────────
router.get('/:albumId/qrcode', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const frontendUrl = config.frontendUrl;
    const pngBuffer = await albumService.generateAlbumQrCode(
      req.params.albumId,
      tenantId,
      frontendUrl
    );

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="album-qr-${req.params.albumId}.png"`);
    return res.end(pngBuffer);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:albumId/download — download ZIP ────────────────────────────────────
router.get('/:albumId/download', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    await albumService.downloadZip(req.params.albumId, tenantId, res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
