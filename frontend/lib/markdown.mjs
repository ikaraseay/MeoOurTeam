import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

const markdown = new MarkdownIt({ html: false, linkify: false, breaks: false });

/** Same safe renderer for the admin preview and the public article body. */
export function renderSafeMarkdown(source) {
  return sanitizeHtml(markdown.render(source), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
  });
}
