'use strict';

const { Router } = require('express');
const multer = require('multer');
const saveDateService = require('../services/saveTheDate.service');
const { authenticate } = require('../middleware/auth');
const R = require('../utils/response');

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB for design photos
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

// All save-the-date routes require authentication
router.use(authenticate);

// ─── GET /templates — get available templates ─────────────────────────────────
router.get('/templates', (req, res) => {
  const templates = saveDateService.getTemplates();
  return R.ok(res, templates);
});

// ─── GET / — list designs ─────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { page, size } = req.query;
    const result = await saveDateService.listDesigns(req.user.userId, {
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 20,
    });
    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST / — create design ───────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const { eventId, title, templateId, textContent, style } = req.body;
    if (!title) return R.badRequest(res, 'title is required');

    const design = await saveDateService.createDesign({
      userId: req.user.userId,
      tenantId,
      eventId: eventId || undefined,
      title,
      templateId: templateId || undefined,
      textContent: textContent || undefined,
      style: style || undefined,
    });

    return R.created(res, design, 'Design created');
  } catch (err) {
    next(err);
  }
});

// ─── GET /:designId — get design ─────────────────────────────────────────────
router.get('/:designId', async (req, res, next) => {
  try {
    const design = await saveDateService.getDesignById(req.params.designId, req.user.userId);
    return R.ok(res, design);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /:designId — update design ────────────────────────────────────────
router.patch('/:designId', async (req, res, next) => {
  try {
    const design = await saveDateService.updateDesign(
      req.params.designId,
      req.user.userId,
      req.body
    );
    return R.ok(res, design, 'Design updated');
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:designId — delete design ───────────────────────────────────────
router.delete('/:designId', async (req, res, next) => {
  try {
    await saveDateService.deleteDesign(req.params.designId, req.user.userId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

// ─── POST /:designId/publish — publish design ────────────────────────────────
router.post('/:designId/publish', async (req, res, next) => {
  try {
    const design = await saveDateService.publishDesign(req.params.designId, req.user.userId);
    return R.ok(res, design, 'Design published');
  } catch (err) {
    next(err);
  }
});

// ─── POST /:designId/generate — generate AI card content + SVG ───────────────
router.post('/:designId/generate', async (req, res, next) => {
  try {
    const design = await saveDateService.generateDesign(req.params.designId, req.user.userId);
    return R.ok(res, design, 'Design generated');
  } catch (err) {
    next(err);
  }
});

// ─── POST /:designId/photo — upload design photo ─────────────────────────────
router.post('/:designId/photo', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) return R.badRequest(res, 'Photo file is required');

    const design = await saveDateService.uploadPhoto({
      designId: req.params.designId,
      userId: req.user.userId,
      file: req.file,
    });

    return R.ok(res, design, 'Photo uploaded successfully');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
