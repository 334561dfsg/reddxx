import {ref, onMounted} from 'vue'
import {createCharityState} from './domain.js'
import {charityService} from './service.js'

// Admin client for the new public site's 公益 channel (/admin/charity/*). Static data (user decision, 2026-11-28): the
// mock runs in this page's memory; nothing is persisted and the public site keeps its own bundled data (no live sync).
export const charityState = ref(createCharityState())
export const charityError = ref(''), charityBusy = ref(false), charityLoaded = ref(false)

export async function refreshCharity() {
  try { charityState.value = charityService().read(); charityError.value = ''; charityLoaded.value = true } catch (error) { charityError.value = error.message }
}
/** Runs one command; rejects with the domain error code. A fresh requestId per call guards against double submission. */
export async function charityCommand(action, args = {}) {
  if (charityBusy.value) throw new Error('busy')
  charityBusy.value = true
  try {
    charityState.value = charityService().command(action, {...args, requestId: args.requestId || crypto.randomUUID()})
    charityError.value = ''
    charityLoaded.value = true
  } finally { charityBusy.value = false }
}
export function useCharityFeed() {
  onMounted(refreshCharity)
  return {state: charityState, error: charityError, busy: charityBusy, loaded: charityLoaded, refresh: refreshCharity}
}

export const localeLabels = {'en-US': 'English', 'zh-TW': '繁體中文', 'fr-FR': 'Français', 'de-DE': 'Deutsch', 'ja-JP': '日本語', 'ko-KR': '한국어'}
export const projectStatusLabels = {listed: '已上架', unlisted: '未上架'}
export const donationStatusLabels = {completed: '已完成'}
export const moduleLabels = {project: '公益项目', stats: '频道统计', system: '系统'}
export const actionLabels = {seed: '载入模拟数据', createProject: '新增项目', saveProject: '保存项目', listProject: '上架项目', unlistProject: '下架项目', saveStats: '保存频道统计'}
export const errorLabels = {
  busy: '操作处理中', duplicate: '请勿重复提交', stale: '数据已被修改，请刷新后再试', project: '项目不存在', status: '项目状态已改变，请刷新后再试',
  projectLocales: '语言版本不合法', projectFallback: 'English 版本的项目名称必须填写（其他语言缺失时回退显示）', projectTitle: '已填写内容的语言版本必须有项目名称',
  projectImage: '请上传封面图片或填写图片地址', projectTarget: '目标金额须大于 0', projectInitial: '初始已募金额不能小于 0', projectPeople: '受助人数须为不小于 0 的整数',
  projectLimits: '单笔最低捐赠须大于 0，最高捐赠不小于最低捐赠', projectSort: '排序权重须为整数',
  statsRaised: '历史募集基数不能小于 0', statsPeople: '历史受助人数基数须为不小于 0 的整数', action: '不支持的操作',
}
export const errorText = error => errorLabels[error?.message || error] || String(error?.message || error || '操作失败')
