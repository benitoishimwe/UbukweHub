'use strict';

const { Router } = require('express');
const multer = require('multer');
const albumService = require('../services/album.service');
const R = require('../utils/response');

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

// ─── POST /album/:token — public album upload via share token ─────────────────
// This endpoint allows event guests to upload photos without an account.
router.post('/album/:token', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return R.badRequest(res, 'A file must be included in the request (field: "file")');

    const uploaderName =
      (req.body && req.body.uploaderName) ||
      req.query.uploaderName ||
      null;

    const media = await albumService.uploadMedia({
      token: req.params.token,
      file: req.file,
      uploaderName,
    });

    return R.created(res, media, 'File uploaded successfully');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
