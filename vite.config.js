import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { cp, mkdir, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

function newTrendPrototype() {
  const rewrite = (preview) => (req, res, next) => {
    const pathname = (req.url || '').split('?')[0]
    if (pathname === '/newtrend') {
      res.writeHead(302, { Location: '/newtrend/' })
      res.end()
      return
    }
    if (pathname.startsWith('/newtrend/assets/') && /\.[^/]+$/.test(pathname)) {
      if (!preview) req.url = req.url.replace('/newtrend/assets/', '/newtrend-website/public/assets/')
    } else if (pathname.startsWith('/newtrend/')) {
      req.url = preview ? '/newtrend/index.html' : '/newtrend-website/index.html'
    }
    next()
  }
  return {
    name: 'newtrend-prototype',
    resolveId(id) {
      if (id.startsWith('/newtrend/assets/')) return `${root}newtrend-website/public/assets/${id.slice('/newtrend/assets/'.length)}`
    },
    configureServer(server) { server.middlewares.use(rewrite(false)) },
    configurePreviewServer(server) { server.middlewares.use(rewrite(true)) },
    async writeBundle() {
      await mkdir(`${root}dist/newtrend`, { recursive: true })
      await cp(`${root}newtrend-website/public/assets`, `${root}dist/newtrend/assets`, { recursive: true })
      await copyFile(`${root}dist/newtrend-website/index.html`, `${root}dist/newtrend/index.html`)
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
  plugins: [vue(), newTrendPrototype(), tradeV2Prototype()],
  build: {
    rollupOptions: { input: { main: `${root}index.html`, newtrend: `${root}newtrend-website/index.html`, tradeV2: `${root}交易v2/index.html` } }
  }
})
