import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { cp, mkdir, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

function newTrendPrototype() {
  const rewrite = (preview) => (req, res, next) => {
    const pathname = (req.url || '').split('?')[0]
    if (pathname === '/newtrend' || pathname === '/newtrend/') {
      res.writeHead(302, { Location: '/newtrend/zh-TW/' })
      res.end()
      return
    }
    if (pathname.startsWith('/newtrend/assets/')) {
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

export default defineConfig({
  plugins: [vue(), newTrendPrototype()],
  build: {
    rollupOptions: { input: { main: `${root}index.html`, newtrend: `${root}newtrend-website/index.html` } }
  }
})
