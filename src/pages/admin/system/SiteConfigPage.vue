<script setup>
// 平台配置 → 站点配置: Ant Design Pro config page (2026-11-28) — PageShell header, grouped Cards with Ant Form,
// sticky bottom action bar, toast feedback (Ant message) and an Ant confirmation dialog instead of native dialogs.
import { computed, onMounted, ref } from 'vue'
import { Button, Card, Col, Form, FormItem, Input, Row, Space, Spin, Switch, Textarea, TypographyText, message } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import { DEFAULT_I18N_BLOCK } from '../../../admin/constants/i18nCatalog'
import { DEFAULT_SITE_CONFIG, siteConfigApi } from '../../../admin/mock/siteConfig'
import { FRONT_WALLET_LOGIN_PROVIDERS } from '../../../stores/frontAuth'

function walletBuiltinLabel(key) {
  return FRONT_WALLET_LOGIN_PROVIDERS.find((p) => p.key === key)?.label || key
}

const config = ref({
  ...DEFAULT_SITE_CONFIG,
  i18n: { ...DEFAULT_I18N_BLOCK }
})
const isSaving = ref(false)
const loading = ref(true)
const fileInputPc = ref(null)
const fileInputMobile = ref(null)

const logoPreviewPc = computed(() => config.value.logoUrlPc || '')
const logoPreviewMobile = computed(() => config.value.logoUrlMobile || '')

const resetOpen = ref(false)

const loadConfig = async () => {
  loading.value = true
  try {
    const result = await siteConfigApi.getSiteConfig()
    if (result.success) {
      config.value = { ...DEFAULT_SITE_CONFIG, ...result.data }
      config.value.i18n = { ...DEFAULT_I18N_BLOCK, ...(config.value.i18n || {}) }
    }
  } catch (e) {
    message.error('加载失败：' + (e?.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  if (isSaving.value) return
  if (!String(config.value.siteName || '').trim()) {
    message.warning('请输入站点名称')
    return
  }

  isSaving.value = true
  try {
    const result = await siteConfigApi.updateSiteConfig(config.value)
    if (result.success) {
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
      message.success(result.message || '站点配置已保存')
    }
  } catch (e) {
    message.error('保存失败：' + (e?.message || '未知错误'))
  } finally {
    isSaving.value = false
  }
}

const resetToDefault = async () => {
  if (isSaving.value) return
  isSaving.value = true
  try {
    const next = { ...DEFAULT_SITE_CONFIG, i18n: { ...DEFAULT_I18N_BLOCK } }
    const r = await siteConfigApi.updateSiteConfig(next)
    if (r.success) {
      config.value = next
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
      message.success(r.message || '已恢复默认配置')
      resetOpen.value = false
    }
  } catch (e) {
    message.error('恢复默认失败：' + (e?.message || '未知错误'))
  } finally {
    isSaving.value = false
  }
}

const triggerFilePc = () => fileInputPc.value?.click()
const triggerFileMobile = () => fileInputMobile.value?.click()

function readLogoFile(event, key) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    message.warning('请上传图片文件')
    event.target.value = ''
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    message.warning('图片大小不能超过 2MB')
    event.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    config.value[key] = e.target?.result || ''
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

const clearLogoPc = () => {
  config.value.logoUrlPc = ''
  if (fileInputPc.value) fileInputPc.value.value = ''
}

const clearLogoMobile = () => {
  config.value.logoUrlMobile = ''
  if (fileInputMobile.value) fileInputMobile.value.value = ''
}

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <PageShell title="站点配置">
    <template #description>
      <TypographyText type="secondary">设置平台展示名称、Logo、登录方式与 SEO 信息；当前为本地持久化示例，可替换为后端接口。</TypographyText>
    </template>
    <Card v-if="loading" :bordered="false"><Spin tip="加载中…" class="site-config-loading" /></Card>

    <template v-else>
      <Form name="site-config" layout="vertical" :model="config" class="site-config-form" @finish="saveConfig">
        <Card title="基础信息" :bordered="false">
          <Row :gutter="24" class="site-config-fields">
            <Col :xs="24" :lg="12">
              <FormItem label="站点名称" name="siteName" required extra="用于页头、页脚等位置的品牌名称展示。">
                <Input v-model:value="config.siteName" placeholder="例如：CryptoX Pro" :maxlength="64" />
              </FormItem>
            </Col>
            <Col :xs="24" :lg="12">
              <FormItem label="副标题 / Slogan（可选）" name="tagline">
                <Input v-model:value="config.tagline" placeholder="一句话描述你的平台" :maxlength="200" />
              </FormItem>
            </Col>
          </Row>
        </Card>

        <Card title="站点 Logo" :bordered="false">
          <TypographyText type="secondary">区分 PC 端与移动端；移动端未设置时，前台会使用 PC 端 Logo。支持 PNG / JPG / SVG / WebP，单张不超过 2MB。</TypographyText>
          <Row :gutter="24" class="site-config-fields site-config-logos">
            <Col :xs="24" :lg="12">
              <FormItem label="PC 端 Logo" name="logoUrlPc">
                <div class="site-config-logo">
                  <div class="site-config-logo-preview">
                    <img v-if="logoPreviewPc" :src="logoPreviewPc" alt="PC Logo" />
                    <TypographyText v-else type="secondary">无图</TypographyText>
                  </div>
                  <Space direction="vertical" :size="8" class="site-config-logo-input">
                    <input ref="fileInputPc" type="file" accept="image/*" class="site-config-file" @change="readLogoFile($event, 'logoUrlPc')" />
                    <Space :size="8" wrap>
                      <Button @click="triggerFilePc"><template #icon><UploadOutlined /></template>上传</Button>
                      <Button v-if="logoPreviewPc" @click="clearLogoPc">清除</Button>
                    </Space>
                    <Input v-model:value="config.logoUrlPc" type="url" placeholder="或填写图片 URL" aria-label="PC 端 Logo 图片 URL" />
                  </Space>
                </div>
              </FormItem>
            </Col>
            <Col :xs="24" :lg="12">
              <FormItem label="移动端 Logo" name="logoUrlMobile">
                <div class="site-config-logo">
                  <div class="site-config-logo-preview">
                    <img v-if="logoPreviewMobile" :src="logoPreviewMobile" alt="移动端 Logo" />
                    <TypographyText v-else type="secondary">无图</TypographyText>
                  </div>
                  <Space direction="vertical" :size="8" class="site-config-logo-input">
                    <input ref="fileInputMobile" type="file" accept="image/*" class="site-config-file" @change="readLogoFile($event, 'logoUrlMobile')" />
                    <Space :size="8" wrap>
                      <Button @click="triggerFileMobile"><template #icon><UploadOutlined /></template>上传</Button>
                      <Button v-if="logoPreviewMobile" @click="clearLogoMobile">清除</Button>
                    </Space>
                    <Input v-model:value="config.logoUrlMobile" type="url" placeholder="或填写图片 URL" aria-label="移动端 Logo 图片 URL" />
                  </Space>
                </div>
              </FormItem>
            </Col>
          </Row>
        </Card>

        <Card title="登录方式" :bordered="false">
          <Row :gutter="24" class="site-config-fields">
            <Col :xs="24" :lg="8">
              <FormItem label="邮箱登录" name="emailLoginEnabled" extra="关闭后前台隐藏邮箱登录与邮箱注册；若邮箱和手机号都关闭，登录页只显示钱包登录按钮。">
                <Switch v-model:checked="config.emailLoginEnabled" aria-label="切换邮箱登录" checked-children="开启" un-checked-children="关闭" />
              </FormItem>
            </Col>
            <Col :xs="24" :lg="8">
              <FormItem label="手机号码登录" name="phoneLoginEnabled" extra="关闭后前台隐藏手机号登录与手机号注册；若邮箱和手机号都关闭，登录页只显示钱包登录按钮。">
                <Switch v-model:checked="config.phoneLoginEnabled" aria-label="切换手机号码登录" checked-children="开启" un-checked-children="关闭" />
              </FormItem>
            </Col>
            <Col :xs="24" :lg="8">
              <FormItem label="区块链钱包登录" name="walletLoginEnabled" extra="关闭后，前台登录页将隐藏 MetaMask、WalletConnect 等钱包入口。">
                <Switch v-model:checked="config.walletLoginEnabled" aria-label="切换区块链钱包登录" checked-children="开启" un-checked-children="关闭" />
              </FormItem>
            </Col>
          </Row>
        </Card>

        <Card v-if="config.walletLoginEnabled" title="钱包登录配置" :bordered="false">
          <TypographyText type="secondary">各钱包独立开关；开启某个钱包后才显示其连接参数。保存后前台仅展示已启用的钱包；自定义名称为空时使用默认展示名。接入真实 Web3 后，可由前端读取 RPC、链 ID、WalletConnect Project ID 等字段。</TypographyText>
          <Row :gutter="[24, 16]" class="site-config-wallets">
            <Col v-for="row in config.walletLoginProviders" :key="row.key" :xs="24" :lg="12">
              <Card size="small" type="inner">
                <template #title>
                  <Space :size="8"><span>{{ walletBuiltinLabel(row.key) }}</span><TypographyText type="secondary" class="font-mono">{{ row.key }}</TypographyText></Space>
                </template>
                <template #extra>
                  <Switch v-model:checked="row.enabled" :aria-label="`切换${walletBuiltinLabel(row.key)}`" size="small" />
                </template>
                <template v-if="row.enabled">
                  <FormItem label="自定义展示名（可选）">
                    <Input v-model:value="row.customLabel" :placeholder="`默认：${walletBuiltinLabel(row.key)}`" :maxlength="48" />
                  </FormItem>
                  <Row v-if="row.key === 'metamask' || row.key === 'rabby'" :gutter="16">
                    <Col :xs="24" :md="12">
                      <FormItem label="默认链 ID（可选）"><Input v-model:value="row.chainId" placeholder="如 1、56、137…" :maxlength="32" /></FormItem>
                    </Col>
                    <Col :xs="24" :md="12">
                      <FormItem label="RPC URL（可选）"><Input v-model:value="row.rpcUrl" type="url" placeholder="https://…" :maxlength="512" /></FormItem>
                    </Col>
                  </Row>
                  <template v-else-if="row.key === 'walletconnect'">
                    <FormItem label="WalletConnect Project ID"><Input v-model:value="row.walletConnectProjectId" placeholder="Cloud 控制台 Project ID" :maxlength="128" /></FormItem>
                    <FormItem label="说明 / Universal Link（可选）"><Input v-model:value="row.appUniversalLink" placeholder="https://…" :maxlength="512" /></FormItem>
                  </template>
                  <FormItem v-else label="应用链接 / 备注（可选）"><Input v-model:value="row.appUniversalLink" placeholder="深度链接或对接说明" :maxlength="512" /></FormItem>
                </template>
                <TypographyText v-else type="secondary">未启用，前台不展示该钱包。</TypographyText>
              </Card>
            </Col>
          </Row>
        </Card>

        <Card title="登录安全" :bordered="false">
          <Row :gutter="24" class="site-config-fields">
            <Col :xs="24" :lg="12">
              <FormItem label="登录图形验证码" name="loginCaptchaEnabled" extra="开启后，前台邮箱登录/注册需填写图片验证码（当前为前端模拟，可接服务端点）。">
                <Switch v-model:checked="config.loginCaptchaEnabled" aria-label="切换登录图形验证码" checked-children="开启" un-checked-children="关闭" />
              </FormItem>
            </Col>
            <Col :xs="24" :lg="12">
              <FormItem label="必填邀请码" name="inviteCodeRequired" extra="开启后，用户登录与注册时都必须填写邀请码（演示环境不校验码是否有效）。">
                <Switch v-model:checked="config.inviteCodeRequired" aria-label="切换必填邀请码" checked-children="开启" un-checked-children="关闭" />
              </FormItem>
            </Col>
          </Row>
        </Card>

        <Card title="SEO 设置" :bordered="false">
          <Row :gutter="24" class="site-config-fields">
            <Col :xs="24" :lg="12">
              <FormItem label="默认页面标题" name="documentTitle" extra="用于浏览器标签标题，各路由可单独覆盖。">
                <Input v-model:value="config.documentTitle" placeholder="留空则使用站点名称作为浏览器标签标题" :maxlength="120" />
              </FormItem>
            </Col>
            <Col :xs="24" :lg="12">
              <FormItem label="Meta 关键词" name="seoKeywords" extra="输出为 meta keywords。">
                <Input v-model:value="config.seoKeywords" placeholder="关键词用英文逗号分隔，例如：合约, 现货, 数字货币" :maxlength="200" />
              </FormItem>
            </Col>
            <Col :xs="24" :lg="12">
              <FormItem label="Meta 描述" name="seoDescription" extra="输出为 meta description。">
                <Textarea v-model:value="config.seoDescription" :rows="3" placeholder="简要描述站点，建议 80～160 字" :maxlength="320" />
              </FormItem>
            </Col>
            <Col :xs="24" :lg="12">
              <FormItem label="Open Graph 图片 URL" name="seoOgImage" extra="og:image，用于链接分享预览。">
                <Input v-model:value="config.seoOgImage" type="url" placeholder="https://... 建议 1200×630" />
              </FormItem>
            </Col>
          </Row>
        </Card>
      </Form>

      <Card class="site-config-footer" :bordered="false" :body-style="{ padding: '12px 24px' }">
        <div class="site-config-actions">
          <Space :size="8" wrap>
            <Button danger :disabled="isSaving" @click="resetOpen = true">恢复默认</Button>
            <Button :disabled="isSaving" @click="loadConfig">重置</Button>
            <Button type="primary" :loading="isSaving" @click="saveConfig">保存</Button>
          </Space>
        </div>
      </Card>
    </template>

    <AdminModal :open="resetOpen" title="恢复默认站点配置" :busy="isSaving" confirm-text="确认恢复默认" danger @close="resetOpen = false" @confirm="resetToDefault">
      <TypographyText>确认恢复为默认配置？将清空已保存的本地站点信息，此操作不能撤销。</TypographyText>
    </AdminModal>
  </PageShell>
</template>

<style scoped>
.site-config-loading{display:block;padding:32px 0}
.site-config-form{display:grid;gap:24px}
.site-config-fields{max-width:1100px}
.site-config-logos,.site-config-wallets{margin-top:16px}
.site-config-logo{display:flex;align-items:flex-start;gap:16px;min-width:0}
.site-config-logo-preview{display:flex;flex-shrink:0;align-items:center;justify-content:center;width:80px;height:80px;overflow:hidden;border:1px dashed rgb(5 5 5 / 15%);border-radius:8px}
.site-config-logo-preview img{max-width:100%;max-height:100%;object-fit:contain}
.site-config-logo-input{flex:1;min-width:0}
.site-config-file[type="file"]{display:none}
.site-config-footer{position:sticky;bottom:0;z-index:10}
.site-config-actions{display:flex;justify-content:flex-end}
</style>
