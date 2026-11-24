import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { t, formatCompact } from './i18n'
import './source-theme.css'
import './styles.css'

const app = createApp(App)
app.config.globalProperties.$compact = formatCompact
app.config.globalProperties.$t = t
app.use(router).mount('#app')
