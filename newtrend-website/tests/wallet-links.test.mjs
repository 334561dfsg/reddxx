import test from 'node:test'
import assert from 'node:assert/strict'
import {WALLETS, walletLink} from '../src/utils/walletLinks.js'

test('each wallet deep link carries the site URL', () => {
  const url = 'https://example.test/NewQuantCapital/'
  assert.deepEqual(WALLETS.map(w => w.id), ['coinbase', 'trust', 'imtoken', 'tokenpocket', 'metamask'])
  assert.equal(walletLink('metamask', url), 'https://metamask.app.link/dapp/example.test/NewQuantCapital/')
  assert.equal(walletLink('coinbase', url), 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(url))
  assert.equal(JSON.parse(decodeURIComponent(walletLink('tokenpocket', url).split('params=')[1])).url, url)
  for (const {id} of WALLETS) assert.ok(walletLink(id, url).includes(id === 'metamask' ? 'example.test' : encodeURIComponent(url)))
  assert.throws(() => walletLink('nope', url))
})
