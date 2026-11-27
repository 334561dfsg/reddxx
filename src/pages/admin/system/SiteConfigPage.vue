<script setup>
import { computed, onMounted, ref } from 'vue'
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

const activeTab = ref('basic')
const tabs = [
  { key: 'basic', label: '基础设置' },
  { key: 'login', label: '登录设置' },
  { key: 'seo', label: 'SEO 设置' }
]

const loadConfig = async () => {
  loading.value = true
  try {
    const result = await siteConfigApi.getSiteConfig()
    if (result.success) {
      config.value = { ...DEFAULT_SITE_CONFIG, ...result.data }
      config.value.i18n = { ...DEFAULT_I18N_BLOCK, ...(config.value.i18n || {}) }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  if (!config.value.siteName.trim()) {
    alert('请输入站点名称')
    return
  }

  isSaving.value = true
  try {
    const result = await siteConfigApi.updateSiteConfig(config.value)
    if (result.success) {
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
      alert(result.message)
    }
  } catch (e) {
    alert('保存失败：' + (e?.message || '未知错误'))
  } finally {
    isSaving.value = false
  }
}

const resetToDefault = () => {
  if (!confirm('确认恢复为默认配置？将清空已保存的本地站点信息。')) return
  config.value = {
    ...DEFAULT_SITE_CONFIG,
    i18n: { ...DEFAULT_I18N_BLOCK }
  }
  siteConfigApi.updateSiteConfig(config.value).then((r) => {
    if (r.success) {
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
      alert(r.message)
    }
  })
}

const triggerFilePc = () => fileInputPc.value?.click()
const triggerFileMobile = () => fileInputMobile.value?.click()

function readLogoFile(event, key) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    alert('请上传图片文件')
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    alert('图片大小不能超过 2MB')
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
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">站点配置</h1>
      <p class="mt-1 text-sm text-slate-500">设置平台展示名称与 Logo，当前为本地持久化示例，可替换为后端接口。</p>
    </div>

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      加载中…
    </div>

    <div v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        class="flex flex-col gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex flex-wrap gap-1 rounded-lg bg-slate-100/90 p-1">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition"
            :class="
              activeTab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            "
            @click="activeTab = t.key"
          >
            {{ t.label }}
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="ant-btn" @click="resetToDefault">恢复默认</button>
          <button
            type="button"
            class="ant-btn ant-btn-primary"
            :disabled="isSaving"
            @click="saveConfig"
          >
            {{ isSaving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>

      <div class="space-y-6 p-6">
        <!-- 基础设置 -->
        <div v-show="activeTab === 'basic'" class="space-y-6">
        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700">站点名称</label>
          <input
            v-model="config.siteName"
            type="text"
            class="ant-input max-w-xl"
            placeholder="例如：CryptoX Pro"
            maxlength="64"
          />
          <p class="mt-1.5 text-xs text-slate-500">用于页头、页脚等位置的品牌名称展示。</p>
        </div>

        <div>
          <label class="mb-2 block text-sm font-medium text-slate-700">副标题 / Slogan（可选）</label>
          <input
            v-model="config.tagline"
            type="text"
            class="ant-input max-w-xl"
            placeholder="一句话描述你的平台"
            maxlength="200"
          />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700">站点 Logo</label>
          <p class="mb-4 text-xs text-slate-500">
            区分 PC 端与移动端；移动端未设置时，前台会使用 PC 端 Logo。支持 PNG / JPG / SVG / WebP，单张不超过 2MB。
          </p>

          <div class="grid gap-6 md:grid-cols-2">
            <div class="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
              <p class="mb-3 text-sm font-medium text-slate-800">PC 端</p>
              <div class="flex flex-wrap items-start gap-4">
                <div
                  class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-200 bg-white"
                >
                  <img
                    v-if="logoPreviewPc"
                    :src="logoPreviewPc"
                    alt="PC Logo"
                    class="max-h-full max-w-full object-contain"
                  />
                  <span v-else class="text-xs text-slate-400">无图</span>
                </div>
                <div class="min-w-0 flex-1 space-y-2">
                  <div class="flex flex-wrap gap-2">
                    <input
                      ref="fileInputPc"
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="readLogoFile($event, 'logoUrlPc')"
                    />
                    <button type="button" class="ant-btn ant-btn-primary" @click="triggerFilePc">上传</button>
                    <button v-if="logoPreviewPc" type="button" class="ant-btn" @click="clearLogoPc">清除</button>
                  </div>
                  <input
                    v-model="config.logoUrlPc"
                    type="url"
                    class="ant-input w-full text-sm"
                    placeholder="或填写图片 URL"
                  />
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
              <p class="mb-3 text-sm font-medium text-slate-800">移动端</p>
              <div class="flex flex-wrap items-start gap-4">
                <div
                  class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-200 bg-white"
                >
                  <img
                    v-if="logoPreviewMobile"
                    :src="logoPreviewMobile"
                    alt="移动端 Logo"
                    class="max-h-full max-w-full object-contain"
                  />
                  <span v-else class="text-xs text-slate-400">无图</span>
                </div>
                <div class="min-w-0 flex-1 space-y-2">
                  <div class="flex flex-wrap gap-2">
                    <input
                      ref="fileInputMobile"
                      type="file"
                      accept="image/*"
                      class="hidden"
                      @change="readLogoFile($event, 'logoUrlMobile')"
                    />
                    <button type="button" class="ant-btn ant-btn-primary" @click="triggerFileMobile">上传</button>
                    <button v-if="logoPreviewMobile" type="button" class="ant-btn" @click="clearLogoMobile">清除</button>
                  </div>
                  <input
                    v-model="config.logoUrlMobile"
                    type="url"
                    class="ant-input w-full text-sm"
                    placeholder="或填写图片 URL"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        <!-- 登录设置 -->
        <div v-show="activeTab === 'login'" class="space-y-4">
          <p class="text-sm text-slate-500">
            配置邮箱登录、手机号登录、钱包登录、图形验证码与邀请码等。
          </p>

          <div class="flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-slate-900">邮箱登录</p>
              <p class="mt-1 text-xs text-slate-500">关闭后前台隐藏邮箱登录与邮箱注册；若邮箱和手机号都关闭，登录页只显示钱包登录按钮。</p>
            </div>
            <button
              type="button"
              :class="config.emailLoginEnabled ? 'bg-blue-600' : 'bg-slate-200'"
              class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
              :aria-pressed="config.emailLoginEnabled"
              aria-label="切换邮箱登录"
              @click="config.emailLoginEnabled = !config.emailLoginEnabled"
            >
              <span
                :class="config.emailLoginEnabled ? 'translate-x-5' : 'translate-x-0'"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              />
            </button>
          </div>

          <div class="flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-slate-900">手机号码登录</p>
              <p class="mt-1 text-xs text-slate-500">关闭后前台隐藏手机号登录与手机号注册；若邮箱和手机号都关闭，登录页只显示钱包登录按钮。</p>
            </div>
            <button
              type="button"
              :class="config.phoneLoginEnabled ? 'bg-blue-600' : 'bg-slate-200'"
              class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
              :aria-pressed="config.phoneLoginEnabled"
              aria-label="切换手机号码登录"
              @click="config.phoneLoginEnabled = !config.phoneLoginEnabled"
            >
              <span
                :class="config.phoneLoginEnabled ? 'translate-x-5' : 'translate-x-0'"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              />
            </button>
          </div>

          <div class="flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-slate-900">区块链钱包登录</p>
              <p class="mt-1 text-xs text-slate-500">
                关闭后，前台登录页将隐藏 MetaMask、WalletConnect 等钱包入口。
              </p>
            </div>
            <button
              type="button"
              :class="config.walletLoginEnabled ? 'bg-blue-600' : 'bg-slate-200'"
              class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
              :aria-pressed="config.walletLoginEnabled"
              aria-label="切换区块链钱包登录"
              @click="config.walletLoginEnabled = !config.walletLoginEnabled"
            >
              <span
                :class="config.walletLoginEnabled ? 'translate-x-5' : 'translate-x-0'"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              />
            </button>
          </div>

          <div
            v-if="config.walletLoginEnabled"
            class="space-y-3 rounded-lg border border-slate-200 bg-white px-4 py-4"
          >
            <p class="text-xs leading-relaxed text-slate-600">
              各钱包独立开关；开启某个钱包后才显示其连接参数。保存后前台仅展示已启用的钱包；自定义名称为空时使用默认展示名。接入真实
              Web3 后，可由前端读取 RPC、链 ID、WalletConnect Project ID 等字段。
            </p>
            <div
              v-for="row in config.walletLoginProviders"
              :key="row.key"
              class="space-y-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-slate-900">{{ walletBuiltinLabel(row.key) }}</p>
                  <p class="mt-0.5 font-mono text-[11px] text-slate-500">{{ row.key }}</p>
                </div>
                <button
                  type="button"
                  :class="row.enabled ? 'bg-blue-600' : 'bg-slate-200'"
                  class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                  :aria-pressed="row.enabled"
                  :aria-label="`切换${walletBuiltinLabel(row.key)}`"
                  @click="row.enabled = !row.enabled"
                >
                  <span
                    :class="row.enabled ? 'translate-x-5' : 'translate-x-0'"
                    class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  />
                </button>
              </div>
              <div v-if="row.enabled" class="space-y-2 border-t border-slate-200/80 pt-3">
                <div>
                  <label class="mb-1 block text-xs font-medium text-slate-600">自定义展示名（可选）</label>
                  <input
                    v-model="row.customLabel"
                    type="text"
                    class="ant-input w-full text-sm"
                    :placeholder="`默认：${walletBuiltinLabel(row.key)}`"
                    maxlength="48"
                  />
                </div>
                <div v-if="row.key === 'metamask' || row.key === 'rabby'" class="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-600">默认链 ID（可选）</label>
                    <input
                      v-model="row.chainId"
                      type="text"
                      class="ant-input w-full text-sm"
                      placeholder="如 1、56、137…"
                      maxlength="32"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-600">RPC URL（可选）</label>
                    <input
                      v-model="row.rpcUrl"
                      type="url"
                      class="ant-input w-full text-sm"
                      placeholder="https://…"
                      maxlength="512"
                    />
                  </div>
                </div>
                <div v-else-if="row.key === 'walletconnect'" class="space-y-2">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-600">WalletConnect Project ID</label>
                    <input
                      v-model="row.walletConnectProjectId"
                      type="text"
                      class="ant-input w-full text-sm"
                      placeholder="Cloud 控制台 Project ID"
                      maxlength="128"
                    />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-600">说明 / Universal Link（可选）</label>
                    <input
                      v-model="row.appUniversalLink"
                      type="text"
                      class="ant-input w-full text-sm"
                      placeholder="https://…"
                      maxlength="512"
                    />
                  </div>
                </div>
                <div v-else>
                  <label class="mb-1 block text-xs font-medium text-slate-600">应用链接 / 备注（可选）</label>
                  <input
                    v-model="row.appUniversalLink"
                    type="text"
                    class="ant-input w-full text-sm"
                    placeholder="深度链接或对接说明"
                    maxlength="512"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="mt-3 flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-slate-900">登录图形验证码</p>
              <p class="mt-1 text-xs text-slate-500">
                开启后，前台邮箱登录/注册需填写图片验证码（当前为前端模拟，可接服务端点）。
              </p>
            </div>
            <button
              type="button"
              :class="config.loginCaptchaEnabled ? 'bg-blue-600' : 'bg-slate-200'"
              class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
              :aria-pressed="config.loginCaptchaEnabled"
              aria-label="切换登录图形验证码"
              @click="config.loginCaptchaEnabled = !config.loginCaptchaEnabled"
            >
              <span
                :class="config.loginCaptchaEnabled ? 'translate-x-5' : 'translate-x-0'"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              />
            </button>
          </div>

          <div class="mt-3 flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-slate-900">必填邀请码</p>
              <p class="mt-1 text-xs text-slate-500">
                开启后，用户登录与注册时都必须填写邀请码（演示环境不校验码是否有效）。
              </p>
            </div>
            <button
              type="button"
              :class="config.inviteCodeRequired ? 'bg-blue-600' : 'bg-slate-200'"
              class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
              :aria-pressed="config.inviteCodeRequired"
              aria-label="切换必填邀请码"
              @click="config.inviteCodeRequired = !config.inviteCodeRequired"
            >
              <span
                :class="config.inviteCodeRequired ? 'translate-x-5' : 'translate-x-0'"
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              />
            </button>
          </div>
        </div>

        <!-- SEO 设置 -->
        <div v-show="activeTab === 'seo'" class="space-y-6">

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">默认页面标题</label>
            <input
              v-model="config.documentTitle"
              type="text"
              class="ant-input max-w-xl"
              placeholder="留空则使用站点名称作为浏览器标签标题"
              maxlength="120"
            />
            <p class="mt-1.5 text-xs text-slate-500">用于浏览器标签标题，各路由可单独覆盖。</p>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">Meta 描述</label>
            <textarea
              v-model="config.seoDescription"
              rows="3"
              class="ant-input max-w-xl resize-y"
              placeholder="简要描述站点，建议 80～160 字"
              maxlength="320"
            />
            <p class="mt-1.5 text-xs text-slate-500">输出为 meta description。</p>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">Meta 关键词</label>
            <input
              v-model="config.seoKeywords"
              type="text"
              class="ant-input max-w-xl"
              placeholder="关键词用英文逗号分隔，例如：合约, 现货, 数字货币"
              maxlength="200"
            />
            <p class="mt-1.5 text-xs text-slate-500">输出为 meta keywords。</p>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">Open Graph 图片 URL</label>
            <input
              v-model="config.seoOgImage"
              type="url"
              class="ant-input max-w-xl"
              placeholder="https://... 建议 1200×630"
            />
            <p class="mt-1.5 text-xs text-slate-500">og:image，用于链接分享预览。</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
