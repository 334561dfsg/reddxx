// News service for the news centre and the home insights. Data comes from the shared news module
// (src/shared/news), seeded from the bundled CoinTeleGraph articles and managed in the admin 内容管理 → 新闻文章.
// The module runs in this page's memory (static mock, user decision 2026-11-27): admin edits do not sync here live.
// Callers pass the locale so responses carry text for the request language, as a real API would.
import {newsService} from '../../../src/shared/news/service.js'
import {featuredList, publicArticle, publicCategories, publicList} from '../../../src/shared/news/domain.js'
import {ApiError, mockCall, snapshot} from './transport.js'

const state = () => newsService().read()

/** GET /news/featured?limit= — home insights: featured live articles by featured weight. */
export const listNews = (locale, limit = 4) => mockCall('news', () => snapshot(featuredList(state(), locale, Date.now(), limit)))

/** GET /news — live articles (newest first) and the enabled category filter, in the request language. */
export const listNewsArticles = locale => mockCall('news', () => {
  const s = state()
  return snapshot({articles: publicList(s, locale), categories: publicCategories(s, locale)})
})

/** GET /news/:id — one live article; old per-language ids and home aliases resolve. ApiError('notFound') otherwise. */
export const getNewsArticle = (id, locale) => mockCall('news', () => {
  const article = publicArticle(state(), id, locale)
  if (!article) throw new ApiError('notFound')
  return snapshot(article)
})
