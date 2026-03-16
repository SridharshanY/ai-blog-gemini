// backend/src/utils/prompts.js
export function makeBlogPrompt({ topic, keywords = [], tone = 'conversational', length = 'medium', language = 'en' }) {
  const kwText = keywords.length ? `Please include these keywords naturally: ${keywords.join(', ')}.` : '';
  return `
You are an expert blog writer. Write a ${length} blog post in ${language} about "${topic}".
Tone: ${tone}.
${kwText}
Structure: Title, short intro, 3-5 subheadings with 1-3 paragraphs each, a conclusion, and 3 suggested SEO meta descriptions (one-line each).
Return only clean HTML (no surrounding commentary).`;
}
