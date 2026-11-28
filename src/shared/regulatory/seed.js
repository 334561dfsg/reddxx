import enUS from '../../../newtrend-website/src/content/documents/en-US.json' with {type: 'json'}
import zhTW from '../../../newtrend-website/src/content/documents/zh-TW.json' with {type: 'json'}
import frFR from '../../../newtrend-website/src/content/documents/fr-FR.json' with {type: 'json'}
import deDE from '../../../newtrend-website/src/content/documents/de-DE.json' with {type: 'json'}
import jaJP from '../../../newtrend-website/src/content/documents/ja-JP.json' with {type: 'json'}
import koKR from '../../../newtrend-website/src/content/documents/ko-KR.json' with {type: 'json'}
import images from '../../../newtrend-website/src/content/document-images.json' with {type: 'json'}
import {createRegulatoryState} from './domain.js'

// Seed: the five regulator pages the public /regulatory-information index links to today (SEC, SFC, GFSOB, FSRA,
// FMSB), in the same order. Title and body come from the public document JSON per language; each page's embedded
// licence image becomes an attachment.
const documents = {'en-US': enUS, 'zh-TW': zhTW, 'fr-FR': frFR, 'de-DE': deDE, 'ja-JP': jaJP, 'ko-KR': koKR}
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const blocksToHtml = blocks => blocks.filter(b => b.tag !== 'img' && b.text)
  .map(b => { const tag = ['h2', 'h3'].includes(b.tag) ? b.tag : 'p'; return `<${tag}>${escape(b.text).replace(/\n/g, '<br>')}</${tag}>` }).join('')

// Byte sizes of the bundled images (newtrend-website/public/assets), so the seed attachments carry real metadata.
const SIZES = {'download-ff9dfab903a4.jpg': 159346, 'download-7d225ebb15c0.webp': 37834, 'download-7f5e1fdf35bc.webp': 40962, 'download-81a572237a51.webp': 55194, 'download-0a6887e0dff9.webp': 241058}

// The five regulator pages the public index links to, in its order.
const CODES = ['SEC', 'SFC', 'GFSOB', 'FSRA', 'FMSB']

export function seedEntries(now = Date.now()) {
  return CODES.map((code, index) => {
    const key = `content/regulation-${code.toLowerCase()}`
    const locales = Object.fromEntries(Object.entries(documents).filter(([, d]) => d[key]).map(([locale, d]) => [locale, {title: d[key].title, body: blocksToHtml(d[key].blocks)}]))
    const attachments = enUS[key].blocks.filter(b => b.tag === 'img' && images[b.src]).map((b, i) => {
      const file = images[b.src].split('/').pop()
      return {attachmentId: `ATT-SEED-${code}-${i + 1}`, name: `${code} licence ${file.slice(file.lastIndexOf('.'))}`.replace(' .', '.'),
        type: file.endsWith('.jpg') ? 'image/jpeg' : 'image/webp', size: SIZES[file] || 1, url: images[b.src], uploadedAt: now}
    })
    return {entryId: `REG-${code}`, locales, attachments,
      // Sort weight: larger first; the first public link gets the largest weight.
      sortWeight: (CODES.length - index) * 10, status: 'published', publishedAt: now, version: 1, createdAt: now, updatedAt: now}
  })
}

export const seedRegulatory = (now = Date.now()) => createRegulatoryState({entries: seedEntries(now)})
