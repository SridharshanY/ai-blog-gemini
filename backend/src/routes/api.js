// backend/src/routes/api.js
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { generateDraft, saveDraft, listDrafts, getDraftById, deleteDraft } from '../controllers/aiController.js';
const router = express.Router();

router.post('/generate', requireAuth, generateDraft); // require login to generate
router.post('/drafts', requireAuth, saveDraft);
router.get('/drafts', requireAuth, listDrafts);
router.get('/drafts/:id', requireAuth, getDraftById);
router.delete('/drafts/:id', requireAuth, deleteDraft);

export default router;
