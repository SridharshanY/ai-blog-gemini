/**
 * convertAITextToHTML
 * Converts raw AI-generated text into clean HTML for Lexical editor
 * - Paragraphs are wrapped in <p>
 * - Headings are wrapped in <h2>
 * - Extra empty lines are removed
 *
 * @param {string} aiText - Raw AI output
 * @returns {string} - Clean HTML
 */
export function convertAITextToHTML(aiText) {
  if (!aiText) return '';

  // Normalize line breaks and split by 2+ newlines
  const blocks = aiText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n\s*\n+/)
    .filter(b => b.trim() !== '');

  let html = '';

  blocks.forEach(block => {
    const line = block.trim();

    // Simple heading detection:
    // - Lines shorter than 60 chars
    // - Starts with a capital letter
    // - Does not end with a period
    if (/^[A-Z][A-Za-z0-9 ,:&'-]+$/.test(line) && line.length < 60 && !line.endsWith('.')) {
      html += `<h2>${line}</h2>\n`;
    } else {
      // Wrap paragraph, replace single line breaks inside paragraph with spaces
      const paragraph = line.replace(/\n/g, ' ');
      html += `<p>${paragraph}</p>\n`;
    }
  });

  return html;
}
