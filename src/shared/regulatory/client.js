import {ref, onMounted} from 'vue'
import {ATTACHMENT_MAX_BYTES, createRegulatoryState} from './domain.js'
import {regulatoryService} from './service.js'

// Admin client for 监管资讯 (/admin/regulatory). Static data (user decision, 2026-11-28): the mock runs in this page's
// memory; nothing is persisted or uploaded, and the public /regulatory-information page keeps its own content.
export const regulatoryState = ref(createRegulatoryState())
export const regulatoryError = ref(''), regulatoryBusy = ref(false), regulatoryLoaded = ref(false)

export async function refreshRegulatory() {
  try { regulatoryState.value = regulatoryService().read(); regulatoryError.value = ''; regulatoryLoaded.value = true } catch (error) { regulatoryError.value = error.message }
}
/** Runs one command; rejects with the domain error code. A fresh requestId per call guards against double submission. */
export async function regulatoryCommand(action, args = {}) {
  if (regulatoryBusy.value) throw new Error('busy')
  regulatoryBusy.value = true
  try {
    regulatoryState.value = regulatoryService().command(action, {...args, requestId: args.requestId || crypto.randomUUID()})
    regulatoryError.value = ''
    regulatoryLoaded.value = true
  } finally { regulatoryBusy.value = false }
}
export function useRegulatoryFeed() {
  onMounted(refreshRegulatory)
  return {state: regulatoryState, error: regulatoryError, busy: regulatoryBusy, loaded: regulatoryLoaded, refresh: refreshRegulatory}
}

export const localeLabels = {'en-US': 'English', 'zh-TW': '繁體中文', 'fr-FR': 'Français', 'de-DE': 'Deutsch', 'ja-JP': '日本語', 'ko-KR': '한국어'}
export const statusLabels = {published: '已发布', unpublished: '未发布'}
export const statusColors = {published: 'green', unpublished: 'default'}
export const errorLabels = {
  busy: '操作处理中', duplicate: '请勿重复提交', stale: '监管资讯已被修改，请刷新后再试', entry: '监管资讯不存在', status: '发布状态已改变，请刷新后再试',
  entryLocales: '语言版本不合法', entryFallback: 'English 版本的标题和正文必须填写（其他语言缺失时回退显示）', entryTitle: '已填写内容的语言版本必须同时填写标题和正文',
  entrySort: '排序权重须为整数', entryStatus: '状态不合法', attachmentLimit: '附件最多 10 个', attachmentName: '附件信息不完整',
  attachmentType: '附件仅支持 PDF、JPG、PNG 或 WebP', attachmentSize: `单个附件不能超过 ${ATTACHMENT_MAX_BYTES / 1024 / 1024}MB`, attachmentUrl: '附件地址无效', attachmentTime: '附件信息不完整',
  action: '不支持的操作',
}
export const errorText = error => errorLabels[error?.message || error] || String(error?.message || error || '操作失败')
export const fileSize = bytes => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
