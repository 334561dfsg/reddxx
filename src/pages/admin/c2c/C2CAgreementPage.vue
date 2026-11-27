<script setup>
// C2C 交易 → 交易协议: one agreement, six language versions in tabs (English first and required, like the news
// editor). A language left fully empty falls back to English on the public site. Single-page form with the shared
// sticky action bar and unsaved-change guard; each save creates a new version and is logged before/after.
import {computed, onBeforeUnmount, ref} from 'vue'
import {onBeforeRouteLeave} from 'vue-router'
import {message, Button, Card, Empty, Form, FormItem, Input, Space, Spin, TabPane, Tabs, Tag, Textarea, TypographyText} from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {AGREEMENT_FALLBACK, AGREEMENT_LOCALES} from '../../../shared/c2c/domain.js'
import {c2cState, c2cError, c2cBusy, refreshC2C, c2cCommand, errorText, localeLabels} from '../../../shared/c2c/client.js'
import {dateTime} from '../strategy/strategyFormat.js'

const form = ref(null), original = ref(''), loading = ref(true), active = ref(AGREEMENT_FALLBACK)
const agreement = computed(() => c2cState.value.agreement)
const dirty = computed(() => !!form.value && JSON.stringify(form.value) !== original.value)
const busy = computed(() => loading.value || c2cBusy.value)
const filled = locale => !!(form.value?.[locale]?.title.trim() || form.value?.[locale]?.body.trim())

function fromState() {
  const contents = agreement.value?.contents || {}
  form.value = Object.fromEntries(AGREEMENT_LOCALES.map(locale => [locale, {title: contents[locale]?.title || '', body: contents[locale]?.body || ''}]))
  original.value = JSON.stringify(form.value)
}
let loadVersion = 0
async function load() {
  const version = ++loadVersion
  loading.value = true
  await refreshC2C()
  if (version !== loadVersion) return
  loading.value = false
  if (c2cError.value) { message.error(errorText(c2cError.value)); form.value = null; return }
  fromState()
}
load()

const leaveOpen = ref(false)
let resolveLeave = null, allowLeave = false
onBeforeRouteLeave(() => { if (c2cBusy.value) return false; if (allowLeave || !dirty.value) return true; if (resolveLeave) return false; leaveOpen.value = true; return new Promise(resolve => { resolveLeave = resolve }) })
function closeLeave(allow) { allowLeave = allow; leaveOpen.value = false }
function finishLeave() { const resolve = resolveLeave; resolveLeave = null; resolve?.(allowLeave); allowLeave = false }
function beforeUnload(event) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => { ++loadVersion; window.removeEventListener('beforeunload', beforeUnload); resolveLeave?.(false) })

const discardOpen = ref(false)
async function save() {
  if (busy.value || !form.value) return
  try {
    await c2cCommand('saveAgreement', {contents: JSON.parse(JSON.stringify(form.value)), expectedVersion: agreement.value.version})
    fromState()
    message.success(`交易协议已保存为 ${agreement.value.versionLabel}`)
  } catch (e) {
    // A missing or half-filled language: show the tab that needs attention.
    if (e?.message === 'agreementDefault') active.value = AGREEMENT_FALLBACK
    else if (e?.message === 'agreementPartial') active.value = AGREEMENT_LOCALES.find(l => { const v = form.value[l]; return !!v.title.trim() !== !!v.body.trim() }) || active.value
    message.error(errorText(e))
  }
}
</script>

<template>
 <PageShell title="C2C 交易协议">
  <template v-if="agreement" #description><TypographyText type="secondary">当前版本 {{ agreement.versionLabel }} · {{ agreement.updatedBy }} 更新于 {{ dateTime(agreement.updatedAt) }}</TypographyText></template>
  <Spin v-if="loading" tip="加载协议…"/>
  <Card v-else-if="!form" :bordered="false"><Empty description="协议加载失败"><Button @click="load">重试</Button></Empty></Card>
  <template v-else>
   <Form name="c2c-agreement-editor" class="c2c-agreement-form" layout="vertical" :model="form" :disabled="c2cBusy" :validate-trigger="[]" @finish="save">
    <Card :bordered="false">
     <Tabs v-model:active-key="active">
      <TabPane v-for="locale in AGREEMENT_LOCALES" :key="locale">
       <template #tab>{{ localeLabels[locale] }}<Tag v-if="locale === AGREEMENT_FALLBACK" class="c2c-locale-tag" color="blue">默认</Tag><Tag v-else-if="!filled(locale)" class="c2c-locale-tag">未填写</Tag></template>
       <FormItem :name="[locale, 'title']" label="标题" :required="locale === AGREEMENT_FALLBACK" :help="locale === AGREEMENT_FALLBACK ? '英文为默认版本，必须填写；其他语言留空时前台显示英文' : '标题和正文需同时填写；都留空则前台显示英文版本'">
        <Input v-model:value="form[locale].title" :maxlength="120" :placeholder="locale === AGREEMENT_FALLBACK ? 'C2C Trading Agreement' : form[AGREEMENT_FALLBACK].title"/>
       </FormItem>
       <FormItem :name="[locale, 'body']" label="正文" :required="locale === AGREEMENT_FALLBACK" help="纯文本，空行分段">
        <Textarea v-model:value="form[locale].body" :auto-size="{minRows: 12, maxRows: 28}" :maxlength="20000" show-count/>
       </FormItem>
      </TabPane>
     </Tabs>
    </Card>
   </Form>
   <Card class="c2c-editor-footer" :body-style="{padding: '12px 24px'}" :bordered="false"><div class="c2c-editor-actions"><Space :size="8" wrap>
    <Button :disabled="c2cBusy || !dirty" @click="discardOpen = true">撤销修改</Button>
    <Button type="primary" :loading="c2cBusy" @click="save">保存协议</Button>
   </Space></div></Card>
  </template>
  <AdminModal :open="discardOpen" title="撤销未保存的修改？" confirm-text="撤销修改" danger @close="discardOpen = false" @confirm="fromState(); discardOpen = false"><TypographyText>所有语言的修改都会恢复为当前版本 {{ agreement?.versionLabel }}。</TypographyText></AdminModal>
  <AdminModal :open="leaveOpen" title="放弃未保存的修改？" confirm-text="放弃修改并离开" danger @close="closeLeave(false)" @confirm="closeLeave(true)" @closed="finishLeave"><TypographyText>当前修改尚未保存，离开后将丢失这些修改。</TypographyText></AdminModal>
 </PageShell>
</template>

<style scoped>
.c2c-agreement-form{display:grid;gap:24px}
.c2c-agreement-form :deep(.ant-form-item){max-width:1000px}
.c2c-locale-tag{margin-inline:6px 0}
.c2c-editor-footer{position:sticky;bottom:0;z-index:10;margin-top:24px}
.c2c-editor-actions{display:flex;justify-content:flex-end}
</style>
