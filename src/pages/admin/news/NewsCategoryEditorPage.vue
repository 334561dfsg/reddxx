<script setup>
// 内容管理 → 新增/编辑新闻分类: single-page form, name per language (English required as the fallback).
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter} from 'vue-router'
import {message, Button, Card, Col, Empty, Form, FormItem, Input, InputNumber, Row, Space, Spin, Switch, TabPane, Tabs, TypographyText} from 'ant-design-vue'
import {ArrowLeftOutlined} from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {FALLBACK_LOCALE, LOCALES} from '../../../shared/news/domain.js'
import {newsState, newsError, newsBusy, refreshNews, newsCommand, errorText, localeLabels} from '../../../shared/news/client.js'

const route = useRoute(), router = useRouter()
const form = ref(null), expectedVersion = ref(null), original = ref(''), loading = ref(true), found = ref(true), tab = ref(FALLBACK_LOCALE)
const plain = value => JSON.parse(JSON.stringify(value))
const toForm = c => ({...plain(c), names: Object.fromEntries(LOCALES.map(l => [l, c.names?.[l] || '']))})
const dirty = computed(() => !!form.value && JSON.stringify(form.value) !== original.value)
const busy = computed(() => loading.value || newsBusy.value)

let loadVersion = 0
async function load() {
  const version = ++loadVersion
  loading.value = true
  form.value = null
  await refreshNews()
  if (version !== loadVersion) return
  loading.value = false
  if (newsError.value) { message.error(errorText(newsError.value)); return }
  const category = route.params.id ? newsState.value.categories.find(c => c.categoryId === route.params.id) : null
  found.value = !route.params.id || !!category
  expectedVersion.value = category?.version ?? null
  form.value = toForm(category || {names: {}, sortOrder: 0, enabled: true})
  original.value = JSON.stringify(form.value)
}
watch(() => route.params.id, load, {immediate: true})
function back() { router.push('/admin/news/categories') }

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

async function save() {
  if (busy.value || !form.value) return
  try {
    await newsCommand('saveCategory', {category: plain(form.value), expectedVersion: expectedVersion.value})
    original.value = JSON.stringify(form.value)
    message.success(route.params.id ? '分类已保存' : '分类已创建')
    back()
  } catch (e) {
    message.error(errorText(e))
    if (e.message === 'categoryFallback') tab.value = FALLBACK_LOCALE
  }
}
</script>

<template>
 <PageShell :title="route.params.id ? '编辑新闻分类' : '新增新闻分类'">
  <template #extra><Button :disabled="newsBusy" aria-label="返回分类列表" @click="back"><template #icon><ArrowLeftOutlined/></template>返回</Button></template>
  <Spin v-if="loading" tip="加载分类…"/>
  <Card v-else-if="!found" :bordered="false"><Empty description="分类不存在或已删除"><Button @click="back">返回分类列表</Button></Empty></Card>
  <Card v-else-if="!form" :bordered="false"><Empty description="分类数据加载失败"><Button @click="load">重试</Button></Empty></Card>
  <template v-else>
   <Form name="news-category-editor" class="news-editor-form" layout="vertical" :model="form" :disabled="newsBusy" :validate-trigger="[]" @finish="save">
    <Card title="分类名称" :bordered="false">
     <Tabs v-model:activeKey="tab">
      <TabPane v-for="locale in LOCALES" :key="locale" :tab="localeLabels[locale] + (locale === FALLBACK_LOCALE ? '（必填）' : form.names[locale].trim() ? '' : '（未填）')">
       <Row :gutter="24" class="news-editor-fields"><Col :xs="24" :lg="8"><FormItem :name="['names', locale]" label="名称" :required="locale === FALLBACK_LOCALE"><Input v-model:value="form.names[locale]" :maxlength="40"/></FormItem></Col></Row>
      </TabPane>
     </Tabs>
    </Card>
    <Card title="展示设置" :bordered="false"><Row :gutter="24" class="news-editor-fields">
     <Col :xs="24" :lg="8"><FormItem name="sortOrder" label="排序权重" help="数值越大越靠前"><InputNumber v-model:value="form.sortOrder" :min="0" :precision="0"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="enabled" label="状态"><Switch v-model:checked="form.enabled" aria-label="分类启用" checked-children="启用" un-checked-children="停用"/></FormItem></Col>
    </Row></Card>
   </Form>
   <Card class="news-editor-footer" :body-style="{padding: '12px 24px'}" :bordered="false"><div class="news-editor-actions"><Space :size="8" wrap><Button :disabled="newsBusy" @click="back">取消</Button><Button type="primary" :loading="newsBusy" @click="save">保存分类</Button></Space></div></Card>
  </template>
  <AdminModal :width="520" :open="leaveOpen" title="放弃未保存的修改？" confirm-text="放弃修改并离开" danger @close="closeLeave(false)" @confirm="closeLeave(true)" @closed="finishLeave"><TypographyText>当前修改尚未保存，离开后将丢失这些修改。</TypographyText></AdminModal>
 </PageShell>
</template>

<style scoped>
.news-editor-form{display:grid;gap:24px}
.news-editor-fields{max-width:1100px}
.news-editor-form :deep(.ant-input-number){width:100%}
.news-editor-footer{position:sticky;bottom:0;z-index:10}
.news-editor-actions{display:flex;justify-content:flex-end}
</style>
