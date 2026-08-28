import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_FRONT_NEWS,
  getFrontNewsById,
  getLocalizedFrontNewsList,
  getFrontNewsList,
  normalizeFrontNews
} from '../src/admin/mock/frontNews.js'
import { DEFAULT_SITE_CONFIG, normalizeSiteConfig } from '../src/admin/mock/siteConfig.js'
import { navTree } from '../src/admin/config/nav.js'
import { consoleRoutes } from '../src/router/modules/console.js'
import { frontDesktopRoutes } from '../src/router/modules/front.js'

const frontHomeSource = readFileSync(
  new URL('../src/pages/front/FrontHomePage.vue', import.meta.url),
  'utf8'
)
const frontNewsDetailPageUrl = new URL('../src/pages/front/FrontNewsDetailPage.vue', import.meta.url)
const adminNewsPageUrl = new URL('../src/pages/admin/system/NewsManagementPage.vue', import.meta.url)

test('front home renders a bottom news module before the footer', () => {
  assert.match(frontHomeSource, /getLocalizedFrontNewsList/)
  assert.match(frontHomeSource, /const homeNewsItems = computed/)
  assert.match(frontHomeSource, /getLocalizedFrontNewsList\(siteConfig\.value\.frontNews/)
  assert.match(frontHomeSource, /resolveFrontLocalePreference/)
  assert.match(frontHomeSource, /const featuredNews = computed/)
  assert.match(frontHomeSource, /const secondaryNews = computed/)
  assert.match(frontHomeSource, /:src="featuredNews\.imageUrl"/)
  assert.match(frontHomeSource, /:alt="featuredNews\.title"/)
  assert.match(frontHomeSource, /aria-labelledby="home-news"/)
  assert.match(frontHomeSource, /id="home-news"/)
  assert.match(frontHomeSource, /新闻资讯/)
  assert.match(frontHomeSource, /v-for="item in secondaryNews"/)
  assert.match(frontHomeSource, /name: 'front-news-detail'/)
  assert.match(frontHomeSource, /line-clamp-2/)
  assert.doesNotMatch(frontHomeSource, /homeNewsArchiveTo/)
  assert.doesNotMatch(frontHomeSource, /更多新闻/)
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
  assert.match(getFrontNewsList()[0].imageUrl, /^https:\/\/images\.unsplash\.com\//)
  assert.equal(getFrontNewsById('fee-display-update')?.title, '现货与合约手续费展示优化')
  assert.equal(getLocalizedFrontNewsList(DEFAULT_FRONT_NEWS, 'en', 'zh-CN')[0].locale, 'en')
  assert.equal(DEFAULT_SITE_CONFIG.frontNews.length >= 4, true)

  const listRoute = frontDesktopRoutes.find((entry) => entry.name === 'front-news')
  assert.equal(listRoute, undefined)

  const detailRoute = frontDesktopRoutes.find((entry) => entry.name === 'front-news-detail')
  assert.equal(detailRoute?.path, 'news/:newsId')
  assert.equal(detailRoute?.meta?.title, '新闻详情')
  assert.equal(detailRoute?.meta?.hideFrontChromeOnMobile, true)
  assert.equal(detailRoute?.meta?.hideFrontFloatingOnMobile, true)
  assert.match(String(detailRoute?.component), /FrontNewsDetailPage/)
})

test('front news detail returns to home and stays independent from announcements', () => {
  const detailSource = readFileSync(frontNewsDetailPageUrl, 'utf8')

  assert.match(detailSource, /getFrontNewsById/)
  assert.match(detailSource, /resolveFrontLocalePreference/)
  assert.match(detailSource, /getSiteConfigSnapshot/)
  assert.match(detailSource, /siteConfig\.value\.frontNews/)
  assert.match(detailSource, /front-news-detail-page-title/)
  assert.match(detailSource, />\s*新闻详情\s*</)
  assert.match(detailSource, /aria-label="返回首页"/)
  assert.match(detailSource, /router\.push\(\{ name: 'front-home-desktop' \}\)/)
  assert.match(detailSource, /news-detail-body/)
  assert.doesNotMatch(detailSource, /front-news'\s*\}/)
  assert.doesNotMatch(detailSource, /front-announcements/)
  assert.doesNotMatch(detailSource, /front-announcement-detail/)
})

test('front news config normalizes editable admin records for the public module', () => {
  const normalized = normalizeSiteConfig({
    frontNews: [
      {
        id: 'custom-news',
        locale: 'en',
        title: '  新资产专区上线  ',
        summary: '  用户可在首页读取最新资讯。  ',
        imageUrl: '  https://cdn.example.com/news/custom.jpg  ',
        html: '<p>详情正文</p>',
        publishedAt: '2026-08-24 11:30',
        enabled: true,
        sort: '3'
      },
      {
        id: 'disabled-news',
        locale: 'zh-CN',
        title: '暂停展示的新闻',
        enabled: false,
        sort: '1'
      },
      {
        id: 'empty-title',
        title: '   '
      }
    ]
  })

  assert.deepEqual(
    normalized.frontNews.map((row) => row.id),
    ['disabled-news', 'custom-news']
  )
  assert.equal(normalized.frontNews[1].locale, 'en')
  assert.equal(normalized.frontNews[1].title, '新资产专区上线')
  assert.equal(normalized.frontNews[1].imageUrl, 'https://cdn.example.com/news/custom.jpg')
  assert.equal(normalized.frontNews[1].sort, 3)
  assert.equal(getFrontNewsList(normalized.frontNews).length, 1)
  assert.equal(getFrontNewsList(normalized.frontNews)[0].id, 'custom-news')
  assert.equal(getLocalizedFrontNewsList(normalized.frontNews, 'vi', 'en')[0].id, 'custom-news')
  assert.equal(normalizeFrontNews([{ title: '无时间新闻' }])[0].publishedAt, '')
  assert.equal(normalizeFrontNews([{ title: '无时间新闻' }])[0].locale, 'zh-CN')
  assert.match(normalizeFrontNews([{ title: '无图片新闻' }])[0].imageUrl, /^https:\/\/images\.unsplash\.com\//)
})

test('front news admin route and platform config menu entry are registered', () => {
  const route = consoleRoutes.find((entry) => entry.name === 'system-front-news')
  assert.equal(route?.path, 'system/news')
  assert.match(String(route?.component), /NewsManagementPage/)
  assert.equal(route?.meta?.title, '平台配置 / 新闻资讯')

  const platformNav = navTree.find((entry) => entry.title === '平台配置')
  assert.ok(platformNav)
  assert.ok(
    platformNav.children.some(
      (entry) => entry.title === '新闻资讯' && entry.path === '/admin/system/news'
    )
  )
})

test('front news admin page uses custom selects and edits independent news content', () => {
  const source = readFileSync(adminNewsPageUrl, 'utf8')
  assert.match(source, /frontNews/)
  assert.match(source, /发布新闻/)
  assert.match(source, /新闻资讯列表/)
  assert.match(source, /新闻标题/)
  assert.match(source, /新闻语言/)
  assert.match(source, /新闻图片/)
  assert.match(source, /formImageUrl/)
  assert.match(source, /formImageFileName/)
  assert.match(source, /formImageError/)
  assert.match(source, /onImageSelected/)
  assert.match(source, /FileReader/)
  assert.match(source, /上传图片/)
  assert.match(source, /移除图片/)
  assert.match(source, /front-news-image-url-input/)
  assert.match(source, /IMAGE_ACCEPT = 'image\/jpeg,image\/png,image\/webp'/)
  assert.match(source, /:accept="IMAGE_ACCEPT"/)
  assert.match(source, /单张不超过 2MB/)
  assert.match(source, /全部语言/)
  assert.match(source, /languageFilter/)
  assert.match(source, /formLocale/)
  assert.match(source, /新闻内容/)
  assert.match(source, /role="combobox"/)
  assert.match(source, /aria-haspopup="listbox"/)
  assert.match(source, /admin-select-trigger/)
  assert.match(source, /news-select-popup/)
  assert.match(source, /siteConfigApi\.updateSiteConfig/)
  assert.doesNotMatch(source, /<select[\s>]/)
  assert.doesNotMatch(source, /announcements/)
  assert.doesNotMatch(source, /新闻分类/)
  assert.doesNotMatch(source, /tagFilter/)
  assert.doesNotMatch(source, /formTag/)
})
