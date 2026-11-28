<script setup>
// 公益 → 新增/编辑项目: dedicated single-page grouped form (AI 金融/新闻 editor conventions), six language tabs with
// English first and required, sticky actions, right-side return, unsaved-change guard. Saving never lists or unlists.
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter} from 'vue-router'
import {message, Button, Card, Col, Empty, Form, FormItem, Image, Input, InputNumber, Row, Space, Spin, TabPane, Tabs, Textarea, TypographyText, Upload} from 'ant-design-vue'
import {ArrowLeftOutlined, UploadOutlined} from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {FALLBACK_LOCALE, LOCALES, donatedAmount, projectsBySort} from '../../../shared/charity/domain.js'
import {charityState, charityError, charityBusy, refreshCharity, charityCommand, errorText, localeLabels} from '../../../shared/charity/client.js'
import {amount} from '../strategy/strategyFormat.js'

const route = useRoute(), router = useRouter()
const form = ref(null), expectedVersion = ref(null), original = ref(''), loading = ref(true), found = ref(true), tab = ref(FALLBACK_LOCALE)
const plain = value => JSON.parse(JSON.stringify(value))
const emptyVersion = () => ({title: '', summary: ''})
const toForm = p => ({...plain(p), locales: Object.fromEntries(LOCALES.map(l => [l, {...emptyVersion(), ...(p.locales?.[l] || {})}]))})
// New projects default above the current top weight so they lead the list once listed.
const blank = () => ({locales: {}, image: '', targetAmount: 100000, initialRaised: 0, peopleHelped: 0, minDonation: 1, maxDonation: 500000,
  sortOrder: (projectsBySort(charityState.value.projects)[0]?.sortOrder ?? 0) + 10})
const filled = locale => !!form.value && Object.values(form.value.locales[locale]).some(v => v.trim())
const dirty = computed(() => !!form.value && JSON.stringify(form.value) !== original.value)
const busy = computed(() => loading.value || charityBusy.value)
const donated = computed(() => (route.params.id ? donatedAmount(charityState.value, route.params.id) : 0))
const raisedHelp = computed(() => {
  const initial = Number(form.value?.initialRaised) || 0, target = Number(form.value?.targetAmount) || 0, raised = initial + donated.value
  return `已募 = 初始已募 + 已完成捐赠 ${amount(donated.value)} = ${amount(raised)} USDT${target > 0 ? `，进度 ${Math.min(100, Math.round(raised / target * 1000) / 10)}%` : ''}`
})

let loadVersion = 0
async function load() {
  const version = ++loadVersion
  loading.value = true
  form.value = null
  await refreshCharity()
  if (version !== loadVersion) return
  loading.value = false
  if (charityError.value) { message.error(errorText(charityError.value)); return }
  const project = route.params.id ? charityState.value.projects.find(p => p.projectId === route.params.id) : null
  found.value = !route.params.id || !!project
  expectedVersion.value = project?.version ?? null
  form.value = toForm(project || blank())
  original.value = JSON.stringify(form.value)
  tab.value = FALLBACK_LOCALE
  uploadedName.value = ''
}
watch(() => route.params.id, load, {immediate: true})

// Cover upload: read into this page's memory as a data URL (static mock; nothing is sent to a server or persisted).
// An address can still be typed instead; an uploaded image hides its long data URL behind the file name.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'], MAX_IMAGE = 2 * 1024 * 1024
const uploadedName = ref('')
const uploaded = computed(() => !!form.value && form.value.image.startsWith('data:image/'))
function pickImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) message.error('请上传 JPG、PNG 或 WebP 图片')
  else if (file.size > MAX_IMAGE) message.error('图片不能超过 2MB')
  else {
    const reader = new FileReader()
    reader.onload = () => { form.value.image = String(reader.result); uploadedName.value = `${file.name}（${(file.size / 1024).toFixed(0)} KB）` }
    reader.onerror = () => message.error('图片读取失败，请重试')
    reader.readAsDataURL(file)
  }
  return false
}
function useAddress() { form.value.image = ''; uploadedName.value = '' }

const listQuery = () => Object.fromEntries(['title', 'projectId', 'status', 'page'].filter(k => route.query[k] != null).map(k => [k, route.query[k]]))
function back() { router.push({path: '/admin/charity/projects', query: listQuery()}) }

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
    await charityCommand('saveProject', {project: plain(form.value), expectedVersion: expectedVersion.value})
    original.value = JSON.stringify(form.value)
    message.success(route.params.id ? '项目已保存' : '项目已创建，默认未上架')
    back()
  } catch (e) {
    message.error(errorText(e))
    if (['projectFallback', 'projectTitle'].includes(e.message)) tab.value = e.message === 'projectFallback' ? FALLBACK_LOCALE : LOCALES.find(l => filled(l) && !form.value.locales[l].title.trim()) || tab.value
  }
}
</script>

<template>
 <PageShell :title="route.params.id ? '编辑公益项目' : '新增公益项目'">
  <template #extra><Button :disabled="charityBusy" aria-label="返回项目列表" @click="back"><template #icon><ArrowLeftOutlined/></template>返回</Button></template>
  <template v-if="route.params.id" #description><TypographyText type="secondary">{{ route.params.id }}<template v-if="expectedVersion"> · v{{ expectedVersion }}</template></TypographyText></template>
  <Spin v-if="loading" tip="加载项目…"/>
  <Card v-else-if="!found" :bordered="false"><Empty description="项目不存在或已失效"><Button @click="back">返回项目列表</Button></Empty></Card>
  <Card v-else-if="!form" :bordered="false"><Empty description="项目数据加载失败"><Button @click="load">重试</Button></Empty></Card>
  <template v-else>
   <Form name="charity-project-editor" class="charity-editor-form" layout="vertical" :model="form" :disabled="charityBusy" :validate-trigger="[]" @finish="save">
    <Card title="项目内容" :bordered="false">
     <Tabs v-model:activeKey="tab">
      <TabPane v-for="locale in LOCALES" :key="locale" :tab="localeLabels[locale] + (locale === FALLBACK_LOCALE ? '（必填）' : filled(locale) ? '' : '（未填）')">
       <Row :gutter="24" class="charity-editor-fields">
        <Col :xs="24"><FormItem :name="['locales', locale, 'title']" label="项目名称" :required="locale === FALLBACK_LOCALE" :help="locale === FALLBACK_LOCALE ? '其他语言未填写时，前台回退显示 English 版本' : '留空则前台显示 English 版本'"><Input v-model:value="form.locales[locale].title" :maxlength="120" show-count/></FormItem></Col>
        <Col :xs="24"><FormItem :name="['locales', locale, 'summary']" label="项目简介"><Textarea v-model:value="form.locales[locale].summary" :auto-size="{minRows: 2, maxRows: 6}" :maxlength="300" show-count/></FormItem></Col>
       </Row>
      </TabPane>
     </Tabs>
    </Card>
    <Card title="封面图片" :bordered="false"><Row :gutter="24" class="charity-editor-fields">
     <Col :xs="24" :lg="16"><FormItem name="image" label="封面图片" required help="支持 JPG、PNG、WebP，不超过 2MB；也可填写站内资源或 https:// 图片地址。前台卡片按 1.6:1 裁切">
      <div class="charity-cover-field">
       <Upload accept="image/jpeg,image/png,image/webp" :show-upload-list="false" :before-upload="pickImage"><Button><template #icon><UploadOutlined/></template>{{ form.image.trim() ? '重新上传' : '上传图片' }}</Button></Upload>
       <template v-if="uploaded"><TypographyText class="charity-cover-name" :ellipsis="{tooltip: true}">已上传{{ uploadedName ? '：' + uploadedName : '本地图片' }}</TypographyText><Button type="link" class="charity-cover-switch" @click="useAddress">改填地址</Button></template>
       <Input v-else v-model:value="form.image" class="charity-cover-url" :maxlength="300" placeholder="或填写图片地址，如 /NewQuantCapital/assets/xxx.jpg" aria-label="封面图片地址"/>
      </div>
     </FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem label="预览"><Image v-if="form.image.trim()" :src="form.image.trim()" :width="192" :height="120" class="charity-preview" alt="封面预览" :preview="false"/><TypographyText v-else type="secondary">上传或填写地址后显示预览</TypographyText></FormItem></Col>
    </Row></Card>
    <Card title="募集设置" :bordered="false"><Row :gutter="24" class="charity-editor-fields">
     <Col :xs="24" :lg="8"><FormItem name="targetAmount" label="目标金额" required><InputNumber v-model:value="form.targetAmount" :min="0" :precision="2" addon-after="USDT"/></FormItem></Col>
     <Col :xs="24" :lg="16"><FormItem name="initialRaised" label="初始已募金额" required :help="raisedHelp"><InputNumber v-model:value="form.initialRaised" :min="0" :precision="2" addon-after="USDT"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="peopleHelped" label="受助人数" required help="前台卡片展示，并计入频道统计"><InputNumber v-model:value="form.peopleHelped" :min="0" :precision="0" addon-after="人"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="minDonation" label="单笔最低捐赠" required><InputNumber v-model:value="form.minDonation" :min="0" :precision="2" addon-after="USDT"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="maxDonation" label="单笔最高捐赠" required><InputNumber v-model:value="form.maxDonation" :min="0" :precision="2" addon-after="USDT"/></FormItem></Col>
    </Row></Card>
    <Card title="展示设置" :bordered="false"><Row :gutter="24" class="charity-editor-fields">
     <Col :xs="24" :lg="8"><FormItem name="sortOrder" label="排序权重" help="数值越大越靠前"><InputNumber v-model:value="form.sortOrder" :min="0" :precision="0"/></FormItem></Col>
    </Row></Card>
   </Form>
   <Card class="charity-editor-footer" :body-style="{padding: '12px 24px'}" :bordered="false"><div class="charity-editor-actions"><Space :size="8" wrap><Button :disabled="charityBusy" @click="back">取消</Button><Button type="primary" :loading="charityBusy" @click="save">保存项目</Button></Space></div></Card>
  </template>
  <AdminModal :width="520" :open="leaveOpen" title="放弃未保存的修改？" confirm-text="放弃修改并离开" danger @close="closeLeave(false)" @confirm="closeLeave(true)" @closed="finishLeave"><TypographyText>当前修改尚未保存，离开后将丢失这些修改。</TypographyText></AdminModal>
 </PageShell>
</template>

<style scoped>
.charity-editor-form{display:grid;gap:24px}
.charity-editor-fields{max-width:1100px}
.charity-editor-form :deep(:is(.ant-input-number,.ant-input-number-group-wrapper)){width:100%}
.charity-preview :deep(img),:deep(.charity-preview){object-fit:cover;border-radius:4px}
.charity-cover-field{display:flex;align-items:center;gap:8px;min-width:0}
.charity-cover-url{flex:1;min-width:0}
.charity-cover-name{min-width:0;max-width:420px}
.charity-cover-switch{padding:0}
.charity-editor-footer{position:sticky;bottom:0;z-index:10}
.charity-editor-actions{display:flex;justify-content:flex-end}
</style>
