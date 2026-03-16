// backend/src/controllers/aiController.js
import Draft from '../models/Draft.js';
import { makeBlogPrompt } from '../utils/prompts.js';
import { ai } from '../config/geminiClient.js'; // Gemini client
import { JSDOM } from 'jsdom';
import mongoose from 'mongoose';

/**
 * Helper to escape plain text into safe HTML paragraphs.
 */
function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * POST /api/generate
 * Generate a blog draft from the AI, return a CLEAN draft object (do not auto-save).
 * - Cleans Markdown fences (```html), decodes encoded backticks,
 * - removes duplicated titles,
 * - extracts <body> innerHTML when the AI returns a full HTML document,
 * - converts plain-text paragraphs to <p> blocks,
 * - extracts suggested SEO meta descriptions into an array (seoMeta).
 */
export async function generateDraft(req, res) {
  try {
    const {
      topic,
      keywords = [],
      tone = 'conversational',
      length = 'medium',
      language = 'en',
      model = process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    } = req.body;

    if (!topic) return res.status(400).json({ error: 'topic is required' });

    const prompt = makeBlogPrompt({ topic, keywords, tone, length, language });

    // Call the Gemini SDK
    const response = await ai.models.generateContent({ model, contents: prompt });

    // Raw AI output (string-ify defensively)
    let text = String(response?.text ?? '');
    console.log('Raw AI output (trimmed):', text.slice(0, 1000));

    // === CLEANING PIPELINE ===
    // 1) Convert common HTML-encoded backtick entities to real backtick
    text = text.replace(/&grave;|&#96;|&#x60;/gi, '`');

    // 2) Remove Markdown fences like ```html, ```text, and any leftover ```
    text = text.replace(/```[a-zA-Z0-9_-]*\s*/g, '');
    text = text.replace(/```/g, '');

    // 3) Remove any lines made only of backticks (defensive)
    text = text.replace(/^\s*`{3,}.*$/gm, '');

    // 4) Trim and remove duplicated first-line title (AI sometimes repeats the title)
    text = text.trim();
    const lines = text.split(/\r?\n/).map(l => l.trim());
    if (lines.length >= 2 && lines[0] && lines[1] && lines[0] === lines[1]) {
      lines.splice(1, 1);
    }
    text = lines.join('\n').trim();

    // === TRY TO EXTRACT BODY HTML ===
    let bodyContent = text;
    try {
      const dom = new JSDOM(text);
      const maybeBody = dom.window.document.body;
      // If parsing produced a non-empty body element, use its innerHTML
      if (maybeBody && maybeBody.children.length > 0) {
        bodyContent = maybeBody.innerHTML.trim();
      } else {
        // If the text contains HTML-like tags (but no body children), keep as-is
        if (/<[a-z][\s\S]*>/i.test(text)) {
          bodyContent = text;
        } else {
          // Plain text fallback -> convert double-newline blocks into <p>
          bodyContent = text
            .split(/\n{2,}/)
            .map(p => `<p>${escapeHtml(p.replace(/\n/g, ' ').trim())}</p>`)
            .join('\n');
        }
      }
    } catch (err) {
      console.warn('JSDOM parse failed - falling back to plain text paragraphs:', err.message);
      bodyContent = text
        .split(/\n{2,}/)
        .map(p => `<p>${escapeHtml(p.replace(/\n/g, ' ').trim())}</p>`)
        .join('\n');
    }

    // === EXTRACT SUGGESTED SEO META DESCRIPTIONS (if present) ===
    // Accept a few common patterns (with or without markdown separators)
    const seoRegex = /(?:-{3,}\s*)?(?:\*\*Suggested SEO Meta Descriptions:\*\*|Suggested SEO Meta Descriptions:)([\s\S]*)$/i;
    let seoMeta = [];
    const seoMatch = bodyContent.match(seoRegex);
    if (seoMatch) {
      seoMeta = seoMatch[1]
        .split(/\r?\n/)
        .map(s => s.replace(/^\s*\d+[\.\)]\s*/, '').trim())
        .filter(Boolean);
      // Remove the matched SEO block from bodyContent
      bodyContent = bodyContent.replace(seoMatch[0], '').trim();
    }

    // Build the cleaned draft object (not saved)
    const draftObj = {
      title: '', // optional: could be generated from first H1 or first sentence
      body: bodyContent,
      seoMeta,
      topic,
      keywords,
      language,
      aiMeta: {
        promptUsed: prompt,
        model,
        tokensUsed: response?.usage?.totalTokens ?? null,
      },
    };

    // By default we DO NOT persist here — frontend should call saveDraft to persist.
    return res.json({ draft: draftObj });
  } catch (err) {
    console.error('AI generate error', err);
    return res.status(500).json({ error: 'generation_failed', details: err.message || String(err) });
  }
}

/**
 * POST /api/drafts
 * Create or update a draft.
 * - If `id` provided, updates that draft (if found).
 * - If no `id`, creates a new draft.
 * - If req.user exists (auth middleware attached), the draft's owner is set/checked.
 */
export async function saveDraft(req, res) {
  try {
    const { id, title, body, keywords = [], topic, seoMeta = [] } = req.body;
    const userId = req.user?.id ?? req.user?._id ?? null; // support either shape

    if (id) {
      // update path: ensure ownership if user present
      const existing = userId
        ? await Draft.findOne({ _id: id, owner: userId })
        : await Draft.findById(id);

      if (!existing) return res.status(404).json({ error: 'not_found' });

      existing.title = title ?? existing.title;
      existing.body = body ?? existing.body;
      existing.keywords = Array.isArray(keywords) ? keywords : existing.keywords;
      existing.topic = topic ?? existing.topic;
      existing.seoMeta = Array.isArray(seoMeta) ? seoMeta : existing.seoMeta;

      await existing.save();
      return res.json({ draft: existing });
    } else {
      // create path
      const newDraftData = {
        title: title ?? '',
        body: body ?? '',
        keywords: Array.isArray(keywords) ? keywords : [],
        topic: topic ?? '',
        seoMeta: Array.isArray(seoMeta) ? seoMeta : [],
      };

      if (userId) newDraftData.owner = new mongoose.Types.ObjectId(userId);

      const draft = new Draft(newDraftData);
      await draft.save();
      return res.json({ draft });
    }
  } catch (err) {
    console.error('saveDraft error', err);
    return res.status(500).json({ error: 'save_failed', details: err.message || String(err) });
  }
}

/**
 * GET /api/drafts/:id
 * Return single draft. If req.user exists, only allow owner to read.
 */
export async function getDraftById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'invalid_id' });

    const userId = req.user?.id ?? req.user?._id ?? null;

    const draft = userId
      ? await Draft.findOne({ _id: id, owner: userId })
      : await Draft.findById(id);

    if (!draft) return res.status(404).json({ error: 'not_found' });
    return res.json({ draft });
  } catch (err) {
    console.error('getDraftById', err);
    return res.status(500).json({ error: 'get_failed', details: err.message || String(err) });
  }
}

/**
 * DELETE /api/drafts/:id
 * Delete a draft. If req.user exists, only allow owner to delete.
 */
export async function deleteDraft(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'invalid_id' });

    const userId = req.user?.id ?? req.user?._id ?? null;

    const draft = userId
      ? await Draft.findOneAndDelete({ _id: id, owner: userId })
      : await Draft.findByIdAndDelete(id);

    if (!draft) return res.status(404).json({ error: 'not_found' });

    return res.json({ success: true, message: 'Draft deleted successfully', id });
  } catch (err) {
    console.error('deleteDraft error:', err);
    return res.status(500).json({ error: 'delete_failed', details: err.message || String(err) });
  }
}

/**
 * GET /api/drafts
 * List drafts.
 * - If req.user exists, return only that user's drafts.
 * - Otherwise return recent drafts (admin/public use).
 */
export async function listDrafts(req, res) {
  try {
    const userId = req.user?.id ?? req.user?._id ?? null;
    const filter = userId ? { owner: userId } : {};
    const drafts = await Draft.find(filter).sort({ updatedAt: -1 }).limit(50);
    return res.json({ drafts });
  } catch (err) {
    console.error('listDrafts error', err);
    return res.status(500).json({ error: 'list_failed', details: err.message || String(err) });
  }
}
