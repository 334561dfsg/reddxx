import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { lendingMockPlugin } from './mock/lendingPlugin.js'
import { strategyMockPlugin } from './mock/strategyPlugin.js'
import { cp, mkdir, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

function newTrendPrototype() {
  const rewrite = (preview) => (req, res, next) => {
    const pathname = (req.url || '').split('?')[0]
    if (pathname === '/newtrend' || pathname.startsWith('/newtrend/')) {
      res.writeHead(302, { Location: (req.url || '').replace(/^\/newtrend(?=\/|\?|$)/, '/NewQuantCapital') })
      res.end()
      return
    }
    if (pathname === '/NewQuantCapital') {
      res.writeHead(302, { Location: '/NewQuantCapital/' + ((req.url || '').includes('?') ? '?' + (req.url || '').split('?').slice(1).join('?') : '') })
      res.end()
      return
    }
    if (pathname.startsWith('/NewQuantCapital/assets/') && /\.[^/]+$/.test(pathname)) {
      if (!preview) req.url = req.url.replace('/NewQuantCapital/assets/', '/newtrend-website/public/assets/')
    } else if (pathname.startsWith('/NewQuantCapital/')) {
      req.url = preview ? '/NewQuantCapital/index.html' : '/newtrend-website/index.html'
    }
    next()
  }
  return {
    name: 'newtrend-prototype',
    resolveId(id) {
      if (id.startsWith('/NewQuantCapital/assets/')) return `${root}newtrend-website/public/assets/${id.slice('/NewQuantCapital/assets/'.length)}`
    },
    configureServer(server) { server.middlewares.use(rewrite(false)) },
    configurePreviewServer(server) { server.middlewares.use(rewrite(true)) },
    async writeBundle() {
      await mkdir(`${root}dist/NewQuantCapital`, { recursive: true })
      await cp(`${root}newtrend-website/public/assets`, `${root}dist/NewQuantCapital/assets`, { recursive: true })
      await copyFile(`${root}dist/newtrend-website/index.html`, `${root}dist/NewQuantCapital/index.html`)
    }
  }
}

function tradeV2Prototype() {
  const rewrite = (preview) => (req, res, next) => {
    const pathname = (req.url || '').split('?')[0]
    if (pathname === '/trade-v2') {
      res.writeHead(302, { Location: '/trade-v2/' })
      res.end()
      return
    }
    if (pathname.startsWith('/trade-v2/assets/')) {
      if (!preview) req.url = req.url.replace('/trade-v2/assets/', '/交易v2/public/assets/')
    } else if (pathname.startsWith('/trade-v2/')) {
      req.url = preview ? '/trade-v2/index.html' : '/交易v2/index.html'
    }
    next()
  }
  return {
    name: 'trade-v2-prototype',
    resolveId(id) {
      if (id.startsWith('/trade-v2/assets/')) return `${root}交易v2/public/assets/${id.slice('/trade-v2/assets/'.length)}`
    },
    configureServer(server) { server.middlewares.use(rewrite(false)) },
    configurePreviewServer(server) { server.middlewares.use(rewrite(true)) },
    async writeBundle() {
      await mkdir(`${root}dist/trade-v2`, { recursive: true })
      await cp(`${root}交易v2/public/assets`, `${root}dist/trade-v2/assets`, { recursive: true })
      await copyFile(`${root}dist/交易v2/index.html`, `${root}dist/trade-v2/index.html`)
    },
  }
}

export default defineConfig({
  plugins: [vue(), lendingMockPlugin(), strategyMockPlugin(), newTrendPrototype(), tradeV2Prototype()],
  build: {
    rollupOptions: { output:{manualChunks(id){
      const match=id.match(/newtrend-website\/src\/locales\/([^/]+)\//)
      if(match)return `newquant-locale-${match[1]}`
    }}, input: { main: `${root}index.html`, newtrend: `${root}newtrend-website/index.html`, tradeV2: `${root}交易v2/index.html` } }
  }
})
