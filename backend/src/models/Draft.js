// backend/src/models/Draft.js (excerpt)
import mongoose from 'mongoose';

const draftSchema = new mongoose.Schema({
  title: String,
  body: String,
  topic: String,
  keywords: [String],
  seoMeta: [String],
  language: String,
  aiMeta: Object,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // new required owner
}, { timestamps: true });

export default mongoose.model('Draft', draftSchema);
