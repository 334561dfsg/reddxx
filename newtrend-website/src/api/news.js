// News service for the home page's insights section. The articles are bundled content (src/content); the catalogue
// objects keep their locale-aware title/summary getters, as a real API would return text per request locale.
import {news} from '../data.js'
import {mockCall} from './transport.js'

/** GET /news?limit= — newest first. */
export const listNews = (limit = news.length) => mockCall('news', () => news.slice(0, limit))
