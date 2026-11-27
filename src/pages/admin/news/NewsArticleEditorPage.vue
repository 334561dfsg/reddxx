<script setup>
// 内容管理 → 新增/编辑文章: dedicated single-page grouped form (no dialog, user decision 2026-11-27), sticky actions,
// right-side return, unsaved-change guard. One article holds all six language versions in tabs.
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter} from 'vue-router'
import dayjs from 'dayjs'
import {message, Button, Card, Col, DatePicker, Empty, Form, FormItem, Input, InputNumber, Row, Select, Space, Spin, Switch, TabPane, Tabs, Textarea, TypographyText} from 'ant-design-vue'
import {ArrowLeftOutlined} from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import NewsRichEditor from './NewsRichEditor.vue'
import {FALLBACK_LOCALE, LOCALES, categoryName} from '../../../shared/news/domain.js'
import {newsState, newsError, newsBusy, refreshNews, newsCommand, errorText, localeLabels} from '../../../shared/news/client.js'

const route = useRoute(), router = useRouter()
const form = ref(null), expectedVersion = ref(null), original = ref(''), loading = ref(true), found = ref(true), tab = ref(FALLBACK_LOCALE)
const plain = value => JSON.parse(JSON.stringify(value))
const emptyVersion = () => ({title: '', summary: '', body: ''})
// Every language tab is always present in the draft; empty ones are dropped on save.
const toForm = a => ({...plain(a), locales: Object.fromEntries(LOCALES.map(l => [l, {...emptyVersion(), ...(a.locales[l] || {})}]))})
const blank = () => toForm({category: null, tags: [], image: '', source: {name: '', url: ''}, publishedAt: Date.now(), featured: false, featuredOrder: 0, locales: {}})
// Disabled categories stay selectable (articles may keep them) but are marked.
const categoryOptions = computed(() => [{value: null, label: '未分类'}, ...newsState.value.categories.map(c => ({value: c.categoryId, label: categoryName(c, FALLBACK_LOCALE) + (c.enabled ? '' : '（已停用）')}))])
const filled = locale => !!form.value?.locales[locale]?.title.trim()
const dirty = computed(() => !!form.value && JSON.stringify(form.value) !== original.value)
const busy = computed(() => loading.value || newsBusy.value)
const publishedAt = computed({get: () => (form.value?.publishedAt ? dayjs(form.value.publishedAt) : null), set: value => { form.value.publishedAt = value ? value.valueOf() : null }})

let loadVersion = 0
async function load() {
  const version = ++loadVersion
  loading.value = true
  form.value = null
  await refreshNews()
  if (version !== loadVersion) return
  loading.value = false
  if (newsError.value) { message.error(errorText(newsError.value)); return }
  const article = route.params.id ? newsState.value.articles.find(a => a.articleId === route.params.id) : null
  found.value = !route.params.id || !!article
  expectedVersion.value = article?.version ?? null
  form.value = article ? toForm(article) : blank()
  original.value = JSON.stringify(form.value)
}
watch(() => route.params.id, load, {immediate: true})

const listQuery = () => Object.fromEntries(['title', 'category', 'state', 'featured', 'page'].filter(k => route.query[k] != null).map(k => [k, route.query[k]]))
function back() { router.push({path: '/admin/news', query: listQuery()}) }

const leaveOpen = ref(false)
let resolveLeave = null, allowLeave = false
function guard() { if (busy.value) return false; if (allowLeave || !dirty.value) return true; if (resolveLeave) return false; leaveOpen.value = true; return new Promise(resolve => { resolveLeave = resolve }) }
onBeforeRouteLeave(guard)
onBeforeRouteUpdate(guard)
function closeLeave(allow) { allowLeave = allow; leaveOpen.value = false }
function finishLeave() { const resolve = resolveLeave; resolveLeave = null; resolve?.(allowLeave); allowLeave = false }
function beforeUnload(event) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => { ++loadVersion; window.removeEventListener('beforeunload', beforeUnload); resolveLeave?.(false) })

// Cover upload: kept as a data URL in this page's memory (static mock, nothing is uploaded or persisted).
const fileInput = ref(null)
function pickImage(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { message.error('请上传 JPG、PNG 或 WebP 图片'); return }
  if (file.size > 2 * 1024 * 1024) { message.error('图片不能超过 2MB'); return }
  const reader = new FileReader()
  reader.onload = () => { form.value.image = String(reader.result) }
  reader.readAsDataURL(file)
}

async function save() {
  if (busy.value || !form.value) return
  try {
    await newsCommand('saveArticle', {article: plain(form.value), expectedVersion: expectedVersion.value})
    original.value = JSON.stringify(form.value)
    message.success(route.params.id ? '文章已保存' : '文章已创建，默认隐藏，可在列表中发布')
    back()
  } catch (e) {
    message.error(errorText(e))
    if (e.message === 'articleFallback') tab.value = FALLBACK_LOCALE
  }
}
</script>

<template>
 <PageShell :title="route.params.id ? '编辑文章' : '新增文章'">
  <template #extra><Button :disabled="newsBusy" aria-label="返回文章列表" @click="back"><template #icon><ArrowLeftOutlined/></template>返回</Button></template>
  <template v-if="route.params.id" #description><TypographyText type="secondary">{{ route.params.id }}<template v-if="expectedVersion"> · v{{ expectedVersion }}</template></TypographyText></template>
  <Spin v-if="loading" tip="加载文章…"/>
  <Card v-else-if="!found" :bordered="false"><Empty description="文章不存在或已删除"><Button @click="back">返回文章列表</Button></Empty></Card>
  <Card v-else-if="!form" :bordered="false"><Empty description="文章数据加载失败"><Button @click="load">重试</Button></Empty></Card>
  <template v-else>
   <Form name="news-article-editor" class="news-editor-form" layout="vertical" :model="form" :disabled="newsBusy" :validate-trigger="[]" @finish="save">
    <Card title="文章内容" :bordered="false">
     <Tabs v-model:activeKey="tab">
      <TabPane v-for="locale in LOCALES" :key="locale" :tab="localeLabels[locale] + (locale === FALLBACK_LOCALE ? '（必填）' : filled(locale) ? '' : '（未填）')">
       <Row :gutter="24" class="news-editor-fields">
        <Col :xs="24"><FormItem :name="['locales', locale, 'title']" label="标题" :required="locale === FALLBACK_LOCALE"><Input v-model:value="form.locales[locale].title" :maxlength="200" show-count/></FormItem></Col>
        <Col :xs="24"><FormItem :name="['locales', locale, 'summary']" label="摘要" :required="locale === FALLBACK_LOCALE"><Textarea v-model:value="form.locales[locale].summary" :auto-size="{minRows: 2, maxRows: 4}" :maxlength="400" show-count/></FormItem></Col>
        <Col :xs="24"><FormItem :name="['locales', locale, 'body']" label="正文"><NewsRichEditor v-model="form.locales[locale].body" :label="localeLabels[locale] + '正文'" :disabled="newsBusy"/></FormItem></Col>
       </Row>
      </TabPane>
     </Tabs>
    </Card>
    <Card title="分类与标签" :bordered="false"><Row :gutter="24" class="news-editor-fields">
     <Col :xs="24" :lg="8"><FormItem name="category" label="分类"><Select v-model:value="form.category" :options="categoryOptions"/></FormItem></Col>
     <Col :xs="24" :lg="16"><FormItem name="tags" label="标签"><Select v-model:value="form.tags" mode="tags" :token-separators="[',', ' ']" placeholder="输入后回车添加，例如 BTCUSDT" :open="false"/></FormItem></Col>
    </Row></Card>
    <Card title="封面与来源" :bordered="false"><Row :gutter="24" class="news-editor-fields">
     <Col :xs="24" :lg="16"><FormItem name="image" label="封面图"><Space direction="vertical" :size="8" class="news-cover-field">
      <Space :size="8"><Input v-model:value="form.image" placeholder="图片地址，或点击右侧上传" class="news-cover-url"/><Button @click="fileInput?.click()">上传图片</Button></Space>
      <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" style="display:none" tabindex="-1" aria-hidden="true" @change="pickImage"/>
      <img v-if="form.image" :src="form.image" alt="封面预览" class="news-cover-preview"/>
     </Space></FormItem></Col>
     <Col :xs="0" :lg="8"/>
     <Col :xs="24" :lg="8"><FormItem :name="['source', 'name']" label="来源名称"><Input v-model:value="form.source.name" :maxlength="60" placeholder="例如 CoinTeleGraph；平台原创可不填"/></FormItem></Col>
     <Col :xs="24" :lg="16"><FormItem :name="['source', 'url']" label="原文链接"><Input v-model:value="form.source.url" placeholder="https://"/></FormItem></Col>
    </Row></Card>
    <Card title="发布设置" :bordered="false"><Row :gutter="24" class="news-editor-fields">
     <Col :xs="24" :lg="8"><FormItem name="publishedAt" label="发布时间" required><DatePicker v-model:value="publishedAt" show-time format="YYYY-MM-DD HH:mm" :allow-clear="false"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="featured" label="首页推荐"><Switch v-model:checked="form.featured" aria-label="首页推荐" checked-children="推荐" un-checked-children="不推荐"/></FormItem></Col>
     <Col v-if="form.featured" :xs="24" :lg="8"><FormItem name="featuredOrder" label="推荐排序权重"><InputNumber v-model:value="form.featuredOrder" :min="0" :precision="0"/></FormItem></Col>
    </Row></Card>
   </Form>
   <Card class="news-editor-footer" :body-style="{padding: '12px 24px'}" :bordered="false"><div class="news-editor-actions"><Space :size="8" wrap><Button :disabled="newsBusy" @click="back">取消</Button><Button type="primary" :loading="newsBusy" @click="save">保存文章</Button></Space></div></Card>
  </template>
  <AdminModal :open="leaveOpen" title="放弃未保存的修改？" confirm-text="放弃修改并离开" danger @close="closeLeave(false)" @confirm="closeLeave(true)" @closed="finishLeave"><TypographyText>当前修改尚未保存，离开后将丢失这些修改。</TypographyText></AdminModal>
 </PageShell>
</template>

<style scoped>
.news-editor-form{display:grid;gap:24px}
.news-editor-fields{max-width:1100px}
.news-editor-form :deep(:is(.ant-input-number,.ant-picker)){width:100%}
.news-cover-field{width:100%}
.news-cover-url{width:min(520px,60vw)}
.news-cover-preview{display:block;width:240px;max-width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:8px}
.news-editor-footer{position:sticky;bottom:0;z-index:10}
.news-editor-actions{display:flex;justify-content:flex-end}
</style>
