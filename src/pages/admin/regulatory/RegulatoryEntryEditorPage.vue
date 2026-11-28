<script setup>
// 内容管理 → 新增/编辑监管资讯: dedicated single page (news editor pattern), sticky actions, right-side return,
// unsaved-change guard. Each language tab is a title plus one large online editor (English first and required). Attachments use the
// installed Ant Design Vue Upload but never leave the page: each file becomes an in-memory object URL (static mock).
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter} from 'vue-router'
import {message, Button, Card, Col, Empty, Form, FormItem, Input, InputNumber, Row, Space, Spin, Table, TabPane, Tabs, TypographyText, Upload} from 'ant-design-vue'
import {ArrowLeftOutlined, UploadOutlined} from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import NewsRichEditor from '../news/NewsRichEditor.vue'
import {ATTACHMENT_LIMIT, ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, FALLBACK_LOCALE, LOCALES} from '../../../shared/regulatory/domain.js'
import {regulatoryState, regulatoryError, regulatoryBusy, refreshRegulatory, regulatoryCommand, errorText, fileSize, localeLabels, statusLabels} from '../../../shared/regulatory/client.js'
import {dateTime} from '../strategy/strategyFormat.js'

const route = useRoute(), router = useRouter()
const form = ref(null), expectedVersion = ref(null), status = ref(null), original = ref(''), loading = ref(true), found = ref(true), tab = ref(FALLBACK_LOCALE)
const plain = value => JSON.parse(JSON.stringify(value))
const emptyVersion = () => ({title: '', body: ''})
const toForm = e => ({...plain(e), locales: Object.fromEntries(LOCALES.map(l => [l, {...emptyVersion(), ...(e.locales[l] || {})}]))})
const nextWeight = () => Math.max(0, ...regulatoryState.value.entries.map(e => e.sortWeight)) + 10
const blank = () => toForm({sortWeight: nextWeight(), attachments: [], locales: {}})
const filled = locale => !!form.value?.locales[locale]?.title.trim()
const dirty = computed(() => !!form.value && JSON.stringify(form.value) !== original.value)
const busy = computed(() => loading.value || regulatoryBusy.value)

let loadVersion = 0
async function load() {
  const version = ++loadVersion
  loading.value = true
  form.value = null
  await refreshRegulatory()
  if (version !== loadVersion) return
  loading.value = false
  if (regulatoryError.value) { message.error(errorText(regulatoryError.value)); return }
  const entry = route.params.id ? regulatoryState.value.entries.find(e => e.entryId === route.params.id) : null
  found.value = !route.params.id || !!entry
  expectedVersion.value = entry?.version ?? null
  status.value = entry?.status ?? null
  form.value = entry ? toForm(entry) : blank()
  original.value = JSON.stringify(form.value)
}
watch(() => route.params.id, load, {immediate: true})

const listQuery = () => Object.fromEntries(['title', 'status', 'page'].filter(k => route.query[k] != null).map(k => [k, route.query[k]]))
function back() { router.push({path: '/admin/regulatory', query: listQuery()}) }

const leaveOpen = ref(false)
let resolveLeave = null, allowLeave = false
function guard() { if (busy.value) return false; if (allowLeave || !dirty.value) return true; if (resolveLeave) return false; leaveOpen.value = true; return new Promise(resolve => { resolveLeave = resolve }) }
onBeforeRouteLeave(guard)
onBeforeRouteUpdate(guard)
function closeLeave(allow) { allowLeave = allow; leaveOpen.value = false }
function finishLeave() { const resolve = resolveLeave; resolveLeave = null; resolve?.(allowLeave); allowLeave = false }
function beforeUnload(event) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)

// ---------- attachments (mock upload: object URL in this page's memory, nothing is sent or persisted) ----------
const created = new Set()
const savedUrls = () => new Set(regulatoryState.value.entries.flatMap(e => e.attachments.map(a => a.url)))
const release = url => { if (created.has(url) && !savedUrls().has(url)) { URL.revokeObjectURL(url); created.delete(url) } }
onBeforeUnmount(() => { ++loadVersion; window.removeEventListener('beforeunload', beforeUnload); resolveLeave?.(false); [...created].forEach(release) })

const accept = '.pdf,.jpg,.jpeg,.png,.webp,' + ATTACHMENT_TYPES.join(',')
let rejected = []
function beforeUpload(file) {
  const problem = !ATTACHMENT_TYPES.includes(file.type) ? `${file.name}：仅支持 PDF、JPG、PNG 或 WebP`
    : file.size > ATTACHMENT_MAX_BYTES ? `${file.name}：不能超过 ${ATTACHMENT_MAX_BYTES / 1024 / 1024}MB`
    : file.size === 0 ? `${file.name}：文件为空`
    : form.value.attachments.length >= ATTACHMENT_LIMIT ? `附件最多 ${ATTACHMENT_LIMIT} 个，${file.name} 未添加` : ''
  if (problem) {
    // Coalesce several rejected files from one selection into a single toast.
    if (!rejected.length) queueMicrotask(() => { message.error(rejected.join('；')); rejected = [] })
    rejected.push(problem)
    return Upload.LIST_IGNORE
  }
  const url = URL.createObjectURL(file)
  created.add(url)
  form.value.attachments.push({attachmentId: `ATT-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`, name: file.name, type: file.type, size: file.size, url, uploadedAt: Date.now()})
  return Upload.LIST_IGNORE
}
function removeAttachment(record) {
  form.value.attachments = form.value.attachments.filter(a => a.attachmentId !== record.attachmentId)
  release(record.url)
}
const typeLabel = type => ({'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP'})[type] || type
const attachmentColumns = [
  {key: 'name', title: '文件名', dataIndex: 'name', ellipsis: true},
  {key: 'type', title: '类型', width: 72},
  {key: 'size', title: '大小', width: 96, align: 'right'},
  {key: 'uploadedAt', title: '上传时间', width: 150},
  {key: 'actions', title: '操作', width: 128},
]

async function save() {
  if (busy.value || !form.value) return
  try {
    await regulatoryCommand('saveEntry', {entry: plain(form.value), expectedVersion: expectedVersion.value})
    original.value = JSON.stringify(form.value)
    message.success(route.params.id ? '监管资讯已保存' : '监管资讯已创建，默认未发布，可在列表中发布')
    back()
  } catch (e) {
    message.error(errorText(e))
    if (['entryFallback', 'entryTitle'].includes(e.message)) tab.value = e.message === 'entryFallback' ? FALLBACK_LOCALE : LOCALES.find(l => { const v = form.value.locales[l]; return (v.title.trim() || v.body) && !(v.title.trim() && v.body) }) || tab.value
  }
}
</script>

<template>
 <PageShell :title="route.params.id ? '编辑监管资讯' : '新增监管资讯'">
  <template #extra><Button :disabled="regulatoryBusy" aria-label="返回监管资讯列表" @click="back"><template #icon><ArrowLeftOutlined/></template>返回</Button></template>
  <template v-if="route.params.id" #description><TypographyText type="secondary">{{ route.params.id }}<template v-if="expectedVersion"> · v{{ expectedVersion }} · {{ statusLabels[status] }}</template></TypographyText></template>
  <Spin v-if="loading" tip="加载监管资讯…"/>
  <Card v-else-if="!found" :bordered="false"><Empty description="监管资讯不存在"><Button @click="back">返回监管资讯列表</Button></Empty></Card>
  <Card v-else-if="!form" :bordered="false"><Empty description="监管资讯加载失败"><Button @click="load">重试</Button></Empty></Card>
  <template v-else>
   <Form name="regulatory-editor" class="reg-editor-form" layout="vertical" :model="form" :disabled="regulatoryBusy" :validate-trigger="[]" @finish="save">
    <Card title="内容" :bordered="false">
     <Tabs v-model:activeKey="tab">
      <TabPane v-for="locale in LOCALES" :key="locale" :tab="localeLabels[locale] + (locale === FALLBACK_LOCALE ? '（必填）' : filled(locale) ? '' : '（未填）')">
       <Row :gutter="24" class="reg-editor-fields">
        <Col :xs="24"><FormItem :name="['locales', locale, 'title']" label="标题" :required="locale === FALLBACK_LOCALE"><Input v-model:value="form.locales[locale].title" :maxlength="200" show-count/></FormItem></Col>
        <Col :xs="24"><FormItem :name="['locales', locale, 'body']" label="正文" :required="locale === FALLBACK_LOCALE"><NewsRichEditor class="reg-body-editor" v-model="form.locales[locale].body" :label="localeLabels[locale] + '正文'" :disabled="regulatoryBusy"/></FormItem></Col>
       </Row>
      </TabPane>
     </Tabs>
    </Card>
    <Card title="附件" :bordered="false">
     <template #extra><TypographyText type="secondary">{{ form.attachments.length }} / {{ ATTACHMENT_LIMIT }}</TypographyText></template>
     <Space direction="vertical" :size="16" class="reg-attachments">
      <Space :size="8" wrap>
       <Upload :accept="accept" multiple :show-upload-list="false" :before-upload="beforeUpload" :disabled="regulatoryBusy || form.attachments.length >= ATTACHMENT_LIMIT">
        <Button :disabled="regulatoryBusy || form.attachments.length >= ATTACHMENT_LIMIT"><template #icon><UploadOutlined/></template>上传附件</Button>
       </Upload>
       <TypographyText type="secondary">牌照扫描件、备案文件等；支持 PDF、JPG、PNG、WebP，单个不超过 {{ ATTACHMENT_MAX_BYTES / 1024 / 1024 }}MB</TypographyText>
      </Space>
      <Table :columns="attachmentColumns" :data-source="form.attachments" row-key="attachmentId" :pagination="false" size="middle" :locale="{emptyText: '暂无附件'}">
       <template #bodyCell="{column, record}">
        <template v-if="column.key === 'type'">{{ typeLabel(record.type) }}</template>
        <template v-else-if="column.key === 'size'">{{ fileSize(record.size) }}</template>
        <template v-else-if="column.key === 'uploadedAt'">{{ dateTime(record.uploadedAt) }}</template>
        <Space v-else-if="column.key === 'actions'" :size="8">
         <Button type="link" :href="record.url" target="_blank" rel="noopener" :aria-label="`预览 ${record.name}`">预览</Button>
         <Button type="link" danger :aria-label="`移除 ${record.name}`" @click="removeAttachment(record)">移除</Button>
        </Space>
       </template>
      </Table>
     </Space>
    </Card>
    <Card title="展示设置" :bordered="false"><Row :gutter="24" class="reg-editor-fields">
     <Col :xs="24" :lg="8"><FormItem name="sortWeight" label="排序权重" extra="数值越大越靠前"><InputNumber v-model:value="form.sortWeight" :min="0" :precision="0"/></FormItem></Col>
    </Row></Card>
   </Form>
   <Card class="reg-editor-footer" :body-style="{padding: '12px 24px'}" :bordered="false"><div class="reg-editor-actions"><Space :size="8" wrap><Button :disabled="regulatoryBusy" @click="back">取消</Button><Button type="primary" :loading="regulatoryBusy" @click="save">保存</Button></Space></div></Card>
  </template>
  <AdminModal :width="520" :open="leaveOpen" title="放弃未保存的修改？" confirm-text="放弃修改并离开" danger @close="closeLeave(false)" @confirm="closeLeave(true)" @closed="finishLeave"><TypographyText>当前修改尚未保存，离开后将丢失这些修改（含新上传的附件）。</TypographyText></AdminModal>
 </PageShell>
</template>

<style scoped>
.reg-editor-form{display:grid;gap:24px}
.reg-editor-fields{max-width:1100px}
.reg-editor-form :deep(.ant-input-number){width:100%}
/* One big online editor per language (user decision, 2026-11-28). */
.reg-body-editor :deep(.news-rich-area){min-height:min(560px,60vh);max-height:none}
.reg-attachments{width:100%;max-width:1100px}
.reg-editor-footer{position:sticky;bottom:0;z-index:10}
.reg-editor-actions{display:flex;justify-content:flex-end}
</style>
