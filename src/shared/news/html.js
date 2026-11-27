// Allow-list cleaner for news bodies written in the admin's simple editor (paragraph, heading, bold, italic, lists,
// http(s) links). Applied when an article is saved and again before the public site renders it with v-html.
// Every other tag is dropped (its text kept); script-like blocks are removed with their content; attributes are
// stripped except a safe href on links.
const ALLOWED = new Set(['p', 'h2', 'h3', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'br', 'a', 'blockquote'])
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|template|noscript|svg|math)\b[\s\S]*?<\/\1\s*>/gi

export function sanitizeHtml(html) {
  const cleaned = String(html ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(DROP_WITH_CONTENT, '')
  return cleaned.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, name, attrs) => {
    const tag = name.toLowerCase()
    if (!ALLOWED.has(tag)) return ''
    if (match.startsWith('</')) return tag === 'br' ? '' : `</${tag}>`
    if (tag !== 'a') return `<${tag}>`
    const href = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs)
    const url = (href?.[1] ?? href?.[2] ?? href?.[3] ?? '').trim()
    return /^https?:\/\/[^\s"'<>]+$/i.test(url) ? `<a href="${url}" target="_blank" rel="noopener noreferrer">` : '<a>'
  // Any "<" left over (malformed markup) is shown as text, never parsed as a tag.
  }).replace(/<(?!\/?(?:p|h2|h3|strong|b|em|i|u|ul|ol|li|br|a|blockquote)\b[^<>]*>)/gi, '&lt;')
}

/** Visible text of a body, used to decide whether a language version has content. */
export const htmlText = html => String(html ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** Plain text (blank-line separated) to editor paragraphs; used for the bundled seed digests. */
export const textToHtml = text => String(text ?? '').split(/\n{2,}/).map(part => part.trim()).filter(Boolean).map(part => `<p>${escape(part).replace(/\n/g, '<br>')}</p>`).join('')
