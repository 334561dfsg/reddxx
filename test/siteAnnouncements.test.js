import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { DEFAULT_SITE_CONFIG, normalizeSiteConfig } from '../src/admin/mock/siteConfig.js'
import { FRONT_LOCALE_CATALOG } from '../src/admin/constants/i18nCatalog.js'
import { navTree } from '../src/admin/config/nav.js'
import { consoleRoutes } from '../src/router/modules/console.js'
import { frontDesktopRoutes } from '../src/router/modules/front.js'

const frontTopNavSource = readFileSync(
  new URL('../src/components/FrontTopNav.vue', import.meta.url),
  'utf8'
)
const frontAnnouncementsPageUrl = new URL('../src/pages/front/FrontAnnouncementsPage.vue', import.meta.url)
const frontAnnouncementDetailPageUrl = new URL('../src/pages/front/FrontAnnouncementDetailPage.vue', import.meta.url)
const frontDesktopLayoutSource = readFileSync(
  new URL('../src/layouts/FrontDesktopLayout.vue', import.meta.url),
  'utf8'
)
const adminAnnouncementsPageSource = readFileSync(
  new URL('../src/pages/admin/system/AnnouncementsPage.vue', import.meta.url),
  'utf8'
)

function readOptionalSource(url) {
  return existsSync(url) ? readFileSync(url, 'utf8') : ''
}

test('site announcement normalization keeps only publishable public announcements', () => {
  const normalized = normalizeSiteConfig({
    i18n: {
      defaultLocale: 'en'
    },
    announcements: [
      {
        id: 'ann-valid',
        title: '  合约系统维护  ',
        summary: '  维护期间部分合约服务暂停  ',
        html: '<p>请提前管理仓位。</p>',
        locale: 'zh-CN',
        priority: 'pinned',
        enabled: true,
        publishedAt: '2026-08-24 10:00',
        sort: '5'
      },
      {
        id: 'ann-disabled',
        title: '暂停展示',
        html: '<p>disabled but kept for editing</p>',
        enabled: false
      },
      {
        id: 'bad-empty-title',
        locales: {
          en: {
            title: '   ',
            html: '<p>empty title should be dropped</p>'
          }
        }
      },
      {
        id: 'ann-i18n',
        priority: 'normal',
        enabled: true,
        publishedAt: '2026-08-23 12:00',
        sort: '6',
        locales: {
          en: {
            title: '  API frequency limit update  ',
            summary: '  REST and websocket limits updated.  ',
            html: '<p>Please review your strategy settings.</p>'
          },
          'zh-CN': {
            title: 'API 频率限制优化公告',
            summary: 'REST 与 websocket 限频已优化。',
            html: '<p>请检查策略参数。</p>'
          }
        }
      }
    ]
  })

  assert.equal(DEFAULT_SITE_CONFIG.announcements.length >= 1, true)
  assert.deepEqual(
    normalized.announcements.map((row) => `${row.id}:${row.locale}`),
    ['ann-valid:zh-CN', 'ann-i18n:en', 'ann-i18n-zh-CN:zh-CN', 'ann-disabled:en']
  )
  assert.deepEqual(normalized.announcements[0], {
    id: 'ann-valid',
    locale: 'zh-CN',
    title: '合约系统维护',
    summary: '维护期间部分合约服务暂停',
    html: '<p>请提前管理仓位。</p>',
    locales: {
      'zh-CN': {
        title: '合约系统维护',
        summary: '维护期间部分合约服务暂停',
        html: '<p>请提前管理仓位。</p>'
      }
    },
    enabled: true,
    publishedAt: '2026-08-24 10:00',
    sort: 5
  })
  assert.equal('priority' in normalized.announcements[0], false)
  assert.equal(normalized.announcements[1].title, 'API frequency limit update')
  assert.equal(normalized.announcements[2].title, 'API 频率限制优化公告')
})

test('default site announcement mocks cover every configured front locale', () => {
  const localeCodes = FRONT_LOCALE_CATALOG.map((item) => item.code)
  const byLocale = new Map()
  for (const row of DEFAULT_SITE_CONFIG.announcements) {
    byLocale.set(row.locale, (byLocale.get(row.locale) || 0) + 1)
  }
  assert.deepEqual([...byLocale.keys()].sort(), [...localeCodes].sort())
  for (const code of localeCodes) {
    assert.equal(byLocale.get(code), 2)
  }
  assert.ok(
    DEFAULT_SITE_CONFIG.announcements.some(
      (row) => row.locale === 'ja' && row.title === 'システムメンテナンスのお知らせ'
    )
  )
  assert.ok(
    DEFAULT_SITE_CONFIG.announcements.some(
      (row) => row.locale === 'ko' && row.title === '시스템 점검 안내'
    )
  )
})

test('site announcement admin route and system menu entry are registered', () => {
  const route = consoleRoutes.find((entry) => entry.name === 'system-announcements')
  assert.equal(route?.path, 'system/announcements')
  assert.match(String(route?.component), /AnnouncementsPage/)
  assert.equal(route?.meta?.title, '系统设置 / 站内公告')

  const systemNav = navTree.find((entry) => entry.title === '系统设置')
  assert.ok(systemNav)
  assert.ok(
    systemNav.children.some(
      (entry) => entry.title === '站内公告' && entry.path === '/admin/system/announcements'
    )
  )
})

test('front announcement routes provide a list page and a detail page', () => {
  const listRoute = frontDesktopRoutes.find((entry) => entry.name === 'front-announcements')
  assert.equal(listRoute?.path, 'announcements')
  assert.equal(listRoute?.meta?.title, '站内公告')
  assert.equal(listRoute?.meta?.hideFrontChromeOnMobile, true)
  assert.equal(listRoute?.meta?.hideFrontFloatingOnMobile, true)
  assert.match(String(listRoute?.component), /FrontAnnouncementsPage/)

  const detailRoute = frontDesktopRoutes.find((entry) => entry.name === 'front-announcement-detail')
  assert.equal(detailRoute?.path, 'announcements/:announcementId')
  assert.equal(detailRoute?.meta?.title, '公告详情')
  assert.equal(detailRoute?.meta?.hideFrontChromeOnMobile, true)
  assert.equal(detailRoute?.meta?.hideFrontFloatingOnMobile, true)
  assert.match(String(detailRoute?.component), /FrontAnnouncementDetailPage/)
})

test('front announcement top-nav entry navigates to route pages instead of opening a modal', () => {
  assert.match(frontTopNavSource, /announcementRoute/)
  assert.match(frontTopNavSource, /goAnnouncementCenter/)
  assert.match(frontTopNavSource, /router\.push\(announcementRoute\.value\)/)
  assert.match(frontTopNavSource, /drawerOnly/)
  assert.match(frontTopNavSource, /mobileDrawerOpen/)
  assert.match(frontTopNavSource, /update:mobileDrawerOpen/)
  assert.match(frontTopNavSource, /drawerOnly \? 'contents'/)
  assert.match(frontTopNavSource, /v-if="!drawerOnly"[\s\S]{0,120}class="mx-auto flex min-h-\[3\.5rem\]/)
  assert.doesNotMatch(frontTopNavSource, /<div\s+v-if="!drawerOnly"[\s\S]{0,80}ref="navRoot"/)
  assert.match(frontTopNavSource, /openMobileDrawer/)
  assert.match(frontTopNavSource, /defineExpose/)
  assert.match(frontTopNavSource, /mobile-open-change/)
  assert.doesNotMatch(frontTopNavSource, /bg-black\/55 backdrop-blur-\[1px\]"[\s\S]{0,80}@click="mobileOpen = false"/)
  assert.doesNotMatch(frontTopNavSource, /bg-black\/50 backdrop-blur-\[1px\]"[\s\S]{0,80}@click="mobileLangSheetOpen = false"/)
  assert.doesNotMatch(frontTopNavSource, /announcementOpen/)
  assert.doesNotMatch(frontTopNavSource, /announcementBadgeText/)
  assert.doesNotMatch(frontTopNavSource, /publicAnnouncements/)
  assert.doesNotMatch(frontTopNavSource, /查看站内公告[\s\S]{0,900}rounded-full bg-lime-400/)
  assert.doesNotMatch(frontTopNavSource, /front-announcement-dialog/)
  assert.doesNotMatch(frontTopNavSource, /announcementView/)
})

test('front announcement pages localize announcement copy from locales', () => {
  const listSource = readOptionalSource(frontAnnouncementsPageUrl)
  const detailSource = readOptionalSource(frontAnnouncementDetailPageUrl)
  assert.match(listSource, /localizedAnnouncements/)
  assert.match(listSource, /row\.locale === currentLocale\.value/)
  assert.match(listSource, /resolveFrontLocalePreference/)
  assert.match(listSource, /toAnnouncementDetail/)
  assert.match(detailSource, /localizedAnnouncements/)
  assert.match(detailSource, /row\.locale === currentLocale\.value/)
  assert.match(detailSource, /aria-label="返回公告列表"/)
  assert.match(detailSource, /announcementId/)
})

test('front announcement mobile routes use standalone pages without global top and bottom bars', () => {
  assert.match(frontDesktopLayoutSource, /frontShellClass/)
  assert.match(frontDesktopLayoutSource, /hideFrontChromeOnMobile\.value/)
  assert.match(frontDesktopLayoutSource, /pb-0 lg:pb-0/)
  assert.match(frontDesktopLayoutSource, /frontBottomTabClass/)
})

test('front announcement list provides an internal mobile page header', () => {
  const listSource = readOptionalSource(frontAnnouncementsPageUrl)
  assert.match(listSource, /front-announcements-title/)
  assert.match(listSource, /drawer-only/)
  assert.match(listSource, /v-model:mobile-drawer-open="navMenuOpen"/)
  assert.match(listSource, /openNavigationMenu/)
  assert.match(listSource, /aria-controls="front-nav-drawer"/)
  assert.match(listSource, /'打开菜单'/)
  assert.match(listSource, /M4 7h16M4 12h16M4 17h10/)
  assert.match(listSource, /pt-\[env\(safe-area-inset-top,0px\)\]/)
  assert.match(listSource, /h-12 items-center justify-center border-b/)
  assert.match(listSource, /md:mb-12 md:h-auto md:min-h-10 md:border-b-0/)
  assert.match(listSource, /border-b border-white\/\[0\.10\] py-0 md:rounded-xl/)
  assert.match(listSource, /lg:hidden/)
})

test('front announcement detail uses a compact route page header and reader layout', () => {
  const detailSource = readOptionalSource(frontAnnouncementDetailPageUrl)
  assert.match(detailSource, /front-announcement-detail-page-title/)
  assert.match(detailSource, />\s*详情\s*</)
  assert.match(detailSource, /aria-label="返回公告列表"/)
  assert.match(detailSource, /M15 5 8 12l7 7/)
  assert.match(detailSource, /pt-\[env\(safe-area-inset-top,0px\)\]/)
  assert.match(detailSource, /relative flex h-12 items-center justify-center/)
  assert.match(detailSource, /absolute left-0 inline-flex h-9 w-9/)
  assert.doesNotMatch(detailSource, /-ml-5/)
  assert.match(detailSource, /front-announcement-detail-title/)
  assert.match(detailSource, /<time class="mt-3 block/)
  assert.match(detailSource, /border-t border-white\/\[0\.12\] pt-5/)
  assert.doesNotMatch(detailSource, />\s*返回公告列表\s*</)
  assert.doesNotMatch(detailSource, /detail\.summary/)
  assert.doesNotMatch(detailSource, />\s*置顶\s*</)
})

test('admin announcement editor uses a custom language select for one-language publishing', () => {
  assert.match(adminAnnouncementsPageSource, /formLocale/)
  assert.match(adminAnnouncementsPageSource, /localeSelectOpen/)
  assert.match(adminAnnouncementsPageSource, /customSelectOpen/)
  assert.match(adminAnnouncementsPageSource, /role="combobox"/)
  assert.match(adminAnnouncementsPageSource, /role="listbox"/)
  assert.match(adminAnnouncementsPageSource, /选择公告语言/)
  assert.match(adminAnnouncementsPageSource, /announcement-status-combobox/)
  assert.doesNotMatch(adminAnnouncementsPageSource, /announcement-priority-combobox/)
  assert.doesNotMatch(adminAnnouncementsPageSource, /formPriority/)
  assert.doesNotMatch(adminAnnouncementsPageSource, /priorityOptions/)
  assert.doesNotMatch(adminAnnouncementsPageSource, />\s*优先级\s*</)
  assert.doesNotMatch(adminAnnouncementsPageSource, />\s*置顶\s*</)
  assert.match(adminAnnouncementsPageSource, /ant-input admin-select-trigger w-full cursor-pointer gap-3/)
  assert.match(adminAnnouncementsPageSource, /\.admin-select-trigger[\s\S]{0,120}display: flex/)
  assert.match(adminAnnouncementsPageSource, /\.admin-select-trigger[\s\S]{0,180}justify-content: space-between/)
  assert.match(adminAnnouncementsPageSource, /<div class="relative">\s*<div\s+id="announcement-locale-combobox"/)
  assert.match(adminAnnouncementsPageSource, /announcement-locale-listbox[\s\S]{0,220}top-\[calc\(100%\+0\.25rem\)\]/)
  assert.match(adminAnnouncementsPageSource, /onCustomSelectKeydown/)
  assert.match(adminAnnouncementsPageSource, /commitCustomSelect/)
  assert.match(adminAnnouncementsPageSource, /inline-flex h-4 w-4 shrink-0/)
  assert.match(adminAnnouncementsPageSource, /rotate-180/)
  assert.match(adminAnnouncementsPageSource, /m5 7\.5 5 5 5-5/)
  assert.doesNotMatch(adminAnnouncementsPageSource, /⌄/)
  assert.doesNotMatch(adminAnnouncementsPageSource, /<select/)
  assert.doesNotMatch(adminAnnouncementsPageSource, /<\/select>/)
  assert.doesNotMatch(adminAnnouncementsPageSource, /<option/)
  assert.doesNotMatch(adminAnnouncementsPageSource, /v-for="loc in localeOptions"[\s\S]*switchLocale/)
  assert.doesNotMatch(adminAnnouncementsPageSource, /formLocales/)
})

test('admin announcement list can filter announcements by language', () => {
  assert.match(adminAnnouncementsPageSource, /languageFilter/)
  assert.match(adminAnnouncementsPageSource, /row\.locale !== languageFilter\.value/)
  assert.match(adminAnnouncementsPageSource, /aria-label="按公告语言筛选"/)
  assert.match(adminAnnouncementsPageSource, /announcement-status-filter-combobox/)
  assert.match(adminAnnouncementsPageSource, /announcement-language-filter-combobox/)
  assert.match(adminAnnouncementsPageSource, /statusFilterOptions/)
  assert.match(adminAnnouncementsPageSource, /languageFilterOptions/)
  assert.match(adminAnnouncementsPageSource, /全部语言/)
  assert.doesNotMatch(adminAnnouncementsPageSource, /仅置顶/)
  assert.match(adminAnnouncementsPageSource, /v-for="\(\s*option,\s*index\s*\) in languageFilterOptions"/)
})
