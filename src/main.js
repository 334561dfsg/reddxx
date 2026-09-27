import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { ConfigProvider, Layout, Menu, Drawer, Button, Table, Pagination, Input, Select, DatePicker, Checkbox, Popover, Card, Form, Alert, Spin, Empty, Tag } from 'ant-design-vue'
import router from './router'
import './styles/tailwind.css'
import './styles/theme.css'
import './admin/styles/dialogMotion.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
;[ConfigProvider, Layout, Menu, Drawer, Button, Table, Pagination, Input, Select, DatePicker, Checkbox, Popover, Card, Form, Alert, Spin, Empty, Tag].forEach(component => app.use(component))
app.mount('#app')
