import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { DEFAULT_FRONT_NEWS, getFrontNewsById, getFrontNewsList } from '../src/admin/mock/frontNews.js'
import { frontDesktopRoutes } from '../src/router/modules/front.js'

const frontHomeSource = readFileSync(
  new URL('../src/pages/front/FrontHomePage.vue', import.meta.url),
  'utf8'
)
const frontNewsPageUrl = new URL('../src/pages/front/FrontNewsPage.vue', import.meta.url)
const frontNewsDetailPageUrl = new URL('../src/pages/front/FrontNewsDetailPage.vue', import.meta.url)

function readOptionalSource(url) {
  return existsSync(url) ? readFileSync(url, 'utf8') : ''
}

test('front home renders a bottom news module before the footer', () => {
  assert.match(frontHomeSource, /getFrontNewsList/)
  assert.match(frontHomeSource, /const homeNewsArchiveTo = `\$\{prefix\}\/news`/)
  assert.match(frontHomeSource, /const featuredNews = computed/)
  assert.match(frontHomeSource, /const secondaryNews = computed/)
  assert.match(frontHomeSource, /aria-labelledby="home-news"/)
  assert.match(frontHomeSource, /id="home-news"/)
  assert.match(frontHomeSource, /新闻资讯/)
  assert.match(frontHomeSource, /更多新闻/)
  assert.match(frontHomeSource, /v-for="item in secondaryNews"/)
  assert.match(frontHomeSource, /name: 'front-news-detail'/)
  assert.match(frontHomeSource, /line-clamp-2/)
  assert.doesNotMatch(frontHomeSource, /const homeNewsArchiveTo = `\$\{prefix\}\/announcements`/)

  const riskIndex = frontHomeSource.indexOf('风险提示：')
  const newsIndex = frontHomeSource.indexOf('id="home-news"')
  const footerIndex = frontHomeSource.indexOf('aria-label="页脚"')
  assert.ok(riskIndex >= 0)
  assert.ok(newsIndex > riskIndex)
  assert.ok(footerIndex > newsIndex)
})

test('front news module has independent data and routes', () => {
  assert.equal(DEFAULT_FRONT_NEWS.length >= 4, true)
  assert.equal(getFrontNewsList()[0].id, 'security-risk-upgrade')
  assert.equal(getFrontNewsById('fee-display-update')?.title, '现货与合约手续费展示优化')

  const listRoute = frontDesktopRoutes.find((entry) => entry.name === 'front-news')
  assert.equal(listRoute?.path, 'news')
  assert.equal(listRoute?.meta?.title, '新闻资讯')
  assert.equal(listRoute?.meta?.hideFrontChromeOnMobile, true)
  assert.equal(listRoute?.meta?.hideFrontFloatingOnMobile, true)
  assert.match(String(listRoute?.component), /FrontNewsPage/)

  const detailRoute = frontDesktopRoutes.find((entry) => entry.name === 'front-news-detail')
  assert.equal(detailRoute?.path, 'news/:newsId')
  assert.equal(detailRoute?.meta?.title, '新闻详情')
  assert.equal(detailRoute?.meta?.hideFrontChromeOnMobile, true)
  assert.equal(detailRoute?.meta?.hideFrontFloatingOnMobile, true)
  assert.match(String(detailRoute?.component), /FrontNewsDetailPage/)
})

test('front news pages render list and detail independently from announcements', () => {
  const listSource = readOptionalSource(frontNewsPageUrl)
  const detailSource = readOptionalSource(frontNewsDetailPageUrl)

  assert.match(listSource, /getFrontNewsList/)
  assert.match(listSource, /front-news-title/)
  assert.match(listSource, /新闻资讯列表/)
  assert.match(listSource, /toNewsDetail/)
  assert.match(listSource, /name: 'front-news-detail'/)
  assert.match(listSource, /drawer-only/)
  assert.match(listSource, /absolute -left-\[18px\] inline-flex h-9 w-9/)

  assert.match(detailSource, /getFrontNewsById/)
  assert.match(detailSource, /front-news-detail-page-title/)
  assert.match(detailSource, />\s*新闻详情\s*</)
  assert.match(detailSource, /aria-label="返回新闻列表"/)
  assert.match(detailSource, /router\.push\(\{ name: 'front-news' \}\)/)
  assert.match(detailSource, /news-detail-body/)
  assert.doesNotMatch(listSource + detailSource, /front-announcements/)
  assert.doesNotMatch(listSource + detailSource, /front-announcement-detail/)
})
