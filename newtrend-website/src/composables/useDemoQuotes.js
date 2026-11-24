import { computed, shallowRef, onMounted, onUnmounted } from 'vue'
import { markets, hotStocks } from '../data'
import { nextQuote } from './quoteModel'

export function useDemoQuotes() {
  const initialStocks = hotStocks.map(([symbol, price, delta, change]) => ({
    symbol, price: Number(price), delta: Number(delta), change: Number(change.replace('%', '')),
    reference: Number(price) - Number(delta),
  }))
  const quotes = shallowRef(markets.map(quote => ({ ...quote, ...initialStocks.find(stock => stock.symbol === quote.symbol) })))
  const stocks = computed(() => initialStocks.map(stock => quotes.value.find(quote => quote.symbol === stock.symbol)))
  const paused = shallowRef(false)
  let timer, sequence = 0
  function stop() { clearInterval(timer); timer = undefined }
  function tick() {
    sequence++
    // Spread updates across visible rows; alternate last-tick direction independently of daily change.
    quotes.value = quotes.value.map((quote, i) => (i + sequence) % 3 === 0
      ? nextQuote(quote, (i + Math.floor(sequence / 3)) % 2 ? 1 : -1, 1 + i % 3) : quote)

  }
  function sync() {
    stop()
    if (!paused.value && !document.hidden) timer = setInterval(tick, 2400)
  }
  function toggle() { paused.value = !paused.value; sync() }
  onMounted(() => { document.addEventListener('visibilitychange', sync); sync() })
  onUnmounted(() => { stop(); document.removeEventListener('visibilitychange', sync) })
  return { quotes, stocks, paused, toggle }
}
