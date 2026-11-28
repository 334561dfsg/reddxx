// Connect-wallet picker (user request, 2026-11-28): pick a wallet app, then 確認 opens this site inside that wallet's
// DApp browser through its deep link, or 複製 copies the site link to paste there. Nothing requests wallet
// permissions or signatures; the demo connection stays a separate local action.
export const WALLETS = [
  {id: 'coinbase', name: 'Coinbase', link: url => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`},
  {id: 'trust', name: 'Trust', link: url => `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(url)}`},
  {id: 'imtoken', name: 'imToken', link: url => `imtokenv2://navigate/DappView?url=${encodeURIComponent(url)}`},
  {id: 'tokenpocket', name: 'TokenPocket', link: url => `tpdapp://open?params=${encodeURIComponent(JSON.stringify({url}))}`},
  {id: 'metamask', name: 'MetaMask', link: url => `https://metamask.app.link/dapp/${url.replace(/^https?:\/\//, '')}`},
]

export function walletLink(id, url) {
  const wallet = WALLETS.find(item => item.id === id)
  if (!wallet) throw new Error(`unknown wallet ${id}`)
  return wallet.link(url)
}
