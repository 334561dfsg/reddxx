<script setup>
// 认证权限配置 — Ant Design Pro config page (2026-11-28): PageShell title, one Card per verification level with an Ant
// Form, and a bottom action bar (primary 保存 + default 重置). The three levels are edited together in one draft
// instead of the old per-card 编辑配置 mode; saving still only updates this page's copy of the mock configuration.
import { computed, ref } from 'vue'
import { Button, Card, Checkbox, CheckboxGroup, Col, Form, FormItem, Row, Space, Tag, TypographyText, message } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import { verificationConfig } from '../../../admin/mock/verification'
import { VERIFICATION_LEVEL, VERIFICATION_DOC_TYPE_OPTIONS } from '../../../constants/verification'

/** 认证等级上的资金与交易品种权限（出金限额在「出金策略」配置） */
const PERMISSION_FIELDS = [
  { key: 'canDeposit', label: '允许入金' },
  { key: 'canWithdraw', label: '允许出金' },
  { key: 'canSpotTrade', label: '允许现货交易' },
  { key: 'canDeliveryContract', label: '允许交割合约' },
  { key: 'canPerpetualContract', label: '允许永续合约' }
]

const LEVELS = [
  { level: VERIFICATION_LEVEL.NONE, title: '未认证用户', color: 'default' },
  { level: VERIFICATION_LEVEL.BASIC, title: '初级认证用户', color: 'blue' },
  // Only the advanced level collects an uploaded document list (unchanged from the old page).
  { level: VERIFICATION_LEVEL.ADVANCED, title: '高级认证用户', color: 'purple', documents: true }
]

/** 规范化：权限字段补齐为布尔值，移除旧的 canTrade 字段 */
function normalize(level, raw) {
  const next = JSON.parse(JSON.stringify(raw))
  const base = verificationConfig[level]
  for (const { key } of PERMISSION_FIELDS) {
    if (typeof next[key] !== 'boolean') {
      next[key] = typeof base[key] === 'boolean' ? base[key] : false
    }
  }
  if ('canTrade' in next) delete next.canTrade
  if (!Array.isArray(next.requireDocuments)) next.requireDocuments = []
  return next
}

// 已保存配置
const configs = ref(Object.fromEntries(LEVELS.map(({ level }) => [level, normalize(level, verificationConfig[level])])))
// 编辑中的草稿
const draft = ref(JSON.parse(JSON.stringify(configs.value)))
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(configs.value))
const saving = ref(false)

const docOptions = VERIFICATION_DOC_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))
const getDocTypeLabel = (docType) => VERIFICATION_DOC_TYPE_OPTIONS.find((opt) => opt.value === docType)?.label || docType

function resetDraft() {
  draft.value = JSON.parse(JSON.stringify(configs.value))
  message.info('已恢复为已保存的配置')
}

function saveConfig() {
  if (saving.value) return
  if (!dirty.value) {
    message.info('配置没有变化')
    return
  }
  saving.value = true
  try {
    configs.value = Object.fromEntries(LEVELS.map(({ level }) => [level, normalize(level, draft.value[level])]))
    draft.value = JSON.parse(JSON.stringify(configs.value))
    // 这里可以添加API调用保存到后端
    message.success('配置保存成功！')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageShell title="认证权限配置" class="verification-config" :style="{ paddingBottom: 0 }">
    <template #description>
      <TypographyText type="secondary">按认证等级配置入金、出金与各交易品种权限；单笔/每日出金限额在「出金策略」中维护。保存后立即对该等级所有用户生效。</TypographyText>
    </template>
    <Form name="verification-config" layout="vertical" :model="draft" @finish="saveConfig">
      <Row :gutter="[24, 24]">
        <Col v-for="item in LEVELS" :key="item.level" :xs="24" :lg="8">
          <Card :bordered="false" class="verification-config-card">
            <template #title>
              <Space :size="8"><span>{{ item.title }}</span><Tag :color="item.color">{{ draft[item.level].levelName }}</Tag></Space>
            </template>
            <TypographyText type="secondary">{{ draft[item.level].description }}</TypographyText>
            <FormItem label="资金与交易权限" class="verification-config-item">
              <Space direction="vertical" :size="8">
                <Checkbox v-for="row in PERMISSION_FIELDS" :key="row.key" v-model:checked="draft[item.level][row.key]">{{ row.label }}</Checkbox>
              </Space>
            </FormItem>
            <FormItem v-if="item.documents" label="需要上传的证件">
              <CheckboxGroup v-model:value="draft[item.level].requireDocuments" :options="docOptions" class="verification-config-docs" />
            </FormItem>
            <FormItem v-else label="需要证件">
              <TypographyText type="secondary">{{ draft[item.level].requireDocuments.length === 0 ? '无需上传证件' : draft[item.level].requireDocuments.map(getDocTypeLabel).join('、') }}</TypographyText>
            </FormItem>
          </Card>
        </Col>
      </Row>
    </Form>
    <Card class="verification-config-footer" :body-style="{ padding: '12px 24px' }" :bordered="false">
      <div class="verification-config-actions">
        <TypographyText v-if="dirty" type="warning">有未保存的修改</TypographyText>
        <Space :size="8" wrap>
          <Button :disabled="saving || !dirty" @click="resetDraft">重置</Button>
          <Button type="primary" :loading="saving" @click="saveConfig">保存</Button>
        </Space>
      </div>
    </Card>
  </PageShell>
</template>

<style scoped>
.verification-config-card { height: 100%; }
.verification-config-item { margin-top: 16px; }
.verification-config-docs { display: flex; flex-direction: column; gap: 8px; }
.verification-config-footer { position: sticky; bottom: 0; z-index: 10; }
.verification-config-actions { display: flex; align-items: center; justify-content: flex-end; gap: 16px; flex-wrap: wrap; padding-bottom: env(safe-area-inset-bottom); }
</style>
