import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const frontHomeSource = readFileSync(
  new URL('../src/pages/front/FrontHomePage.vue', import.meta.url),
  'utf8'
)

test('front home renders a bottom news module before the footer', () => {
  assert.match(frontHomeSource, /const homeNewsItems = \[/)
  assert.match(frontHomeSource, /const featuredNews = computed/)
  assert.match(frontHomeSource, /const secondaryNews = computed/)
  assert.match(frontHomeSource, /aria-labelledby="home-news"/)
  assert.match(frontHomeSource, /id="home-news"/)
  assert.match(frontHomeSource, /新闻资讯/)
  assert.match(frontHomeSource, /更多新闻/)
  assert.match(frontHomeSource, /v-for="item in secondaryNews"/)
  assert.match(frontHomeSource, /line-clamp-2/)

  const riskIndex = frontHomeSource.indexOf('风险提示：')
  const newsIndex = frontHomeSource.indexOf('id="home-news"')
  const footerIndex = frontHomeSource.indexOf('aria-label="页脚"')
  assert.ok(riskIndex >= 0)
  assert.ok(newsIndex > riskIndex)
  assert.ok(footerIndex > newsIndex)
})
