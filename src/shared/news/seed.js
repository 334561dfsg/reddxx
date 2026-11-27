import snapshots from '../../../newtrend-website/src/content/news/articles.json' with {type: 'json'}
import digests from '../../../newtrend-website/src/content/news/digests.json' with {type: 'json'}
import sources from '../../../newtrend-website/src/content/news/sources.json' with {type: 'json'}
import assetSources from '../../../newtrend-website/asset-sources.json' with {type: 'json'}
import {LOCALES, createNewsState} from './domain.js'
import {textToHtml} from './html.js'

// Seed: the public site's 20 bundled CoinTeleGraph articles, joined across the six languages by cover image (the
// per-language JSON ids differ). Publish times keep the snapshot's "N hours ago" relative to page load. The four home
// insights keep their existing order and categories, and their old /news/<alias> links keep working.
const HOUR = 3600000
const home = {1: ['google', 'macro'], 2: ['ethereum', 'crypto'], 3: ['cftc', 'market-updates'], 4: ['binance', 'crypto']}
// The four categories the public filter showed (in English only); now named per language and managed in the admin.
export const seedCategories = now => [
  ['market-updates', 40, 'Market Updates', '市場動態', 'Actualités du marché', 'Marktnachrichten', 'マーケット動向', '시장 동향'],
  ['crypto', 30, 'Crypto', '加密貨幣', 'Crypto', 'Krypto', '暗号資産', '암호화폐'],
  ['macro', 20, 'Macro', '宏觀', 'Macro', 'Makro', 'マクロ', '거시경제'],
  ['platform', 10, 'Platform Announcements', '平台公告', 'Annonces de la plateforme', 'Plattform-Ankündigungen', 'プラットフォームのお知らせ', '플랫폼 공지'],
].map(([categoryId, sortOrder, en, zh, fr, de, ja, ko]) => ({categoryId, sortOrder, enabled: true, version: 1, updatedAt: now,
  names: {'en-US': en, 'zh-TW': zh, 'fr-FR': fr, 'de-DE': de, 'ja-JP': ja, 'ko-KR': ko}}))
const categoryIdOf = {'Market Updates': 'market-updates', Crypto: 'crypto', Macro: 'macro', 'Platform Announcements': 'platform'}
const assetPath = url => (assetSources[url] ? `/NewQuantCapital/assets/${assetSources[url]}` : url)

export function seedArticles(now = Date.now()) {
  return snapshots['en-US'].map((en, index) => {
    const versions = Object.fromEntries(LOCALES.map(locale => [locale, snapshots[locale].find(n => n.image === en.image)]).filter(([, v]) => v))
    const hours = Number(/·(\d+)/.exec(en.meta)?.[1] ?? index + 1)
    const metaCategory = en.meta.split('·')[2]
    const [alias, homeCategory] = home[index] || []
    const source = sources.find(n => n.image === en.image)
    return {
      articleId: en.id,
      legacyIds: [...new Set([...Object.values(versions).map(v => v.id).filter(id => id !== en.id), ...(alias ? [alias] : [])])],
      image: assetPath(en.image),
      category: categoryIdOf[metaCategory] || homeCategory || null,
      tags: en.tags.filter(tag => !categoryIdOf[tag]),
      source: {name: 'CoinTeleGraph', url: source?.url || ''},
      locales: Object.fromEntries(Object.entries(versions).map(([locale, v]) => [locale, {title: v.title, summary: v.summary, body: textToHtml(digests[index]?.[locale])}])),
      publishedAt: now - hours * HOUR,
      featured: !!alias, featuredOrder: alias ? (5 - index) * 10 : 0,
      status: 'published', version: 1, updatedAt: now,
    }
  })
}

export function seedNews(now = Date.now()) {
  return createNewsState({articles: seedArticles(now), categories: seedCategories(now)})
}
