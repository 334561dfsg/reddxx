import {ref, onMounted} from 'vue'
import {createNewsState} from './domain.js'
import {newsService} from './service.js'

// Admin client for the new-site news centre (/admin/news). Static data (user decision, 2026-11-27): the mock runs in
// this page's memory; nothing is persisted and the public site keeps its own copy of the same seed (no live sync).
export const newsState = ref(createNewsState())
export const newsError = ref(''), newsBusy = ref(false), newsLoaded = ref(false)

export async function refreshNews() {
  try { newsState.value = newsService().read(); newsError.value = ''; newsLoaded.value = true } catch (error) { newsError.value = error.message }
}
/** Runs one command; rejects with the domain error code. A fresh requestId per call guards against double submission. */
export async function newsCommand(action, args = {}) {
  if (newsBusy.value) throw new Error('busy')
  newsBusy.value = true
  try {
    newsState.value = newsService().command(action, {...args, requestId: args.requestId || crypto.randomUUID()})
    newsError.value = ''
    newsLoaded.value = true
  } finally { newsBusy.value = false }
}
export function useNewsFeed() {
  onMounted(refreshNews)
  return {state: newsState, error: newsError, busy: newsBusy, loaded: newsLoaded, refresh: refreshNews}
}

export const localeLabels = {'en-US': 'English', 'zh-TW': '繁體中文', 'fr-FR': 'Français', 'de-DE': 'Deutsch', 'ja-JP': '日本語', 'ko-KR': '한국어'}
export const stateLabels = {live: '已发布', scheduled: '定时发布', hidden: '已隐藏'}
export const stateColors = {live: 'green', scheduled: 'blue', hidden: 'default'}
export const actionLabels = {saveArticle: '保存文章', publish: '发布文章', hide: '隐藏文章', deleteArticle: '删除文章', saveCategory: '保存分类', deleteCategory: '删除分类'}
export const errorLabels = {
  busy: '操作处理中', duplicate: '请勿重复提交', stale: '文章已被修改，请刷新后再试', article: '文章不存在', status: '文章状态已改变，请刷新后再试',
  articleLocales: '语言版本不合法', articleFallback: 'English 版本的标题和摘要必须填写（其他语言缺失时回退显示）', articleTitle: '已填写内容的语言版本必须有标题',
  articleCategory: '请选择有效的分类', articleTags: '标签不能为空白', articleSourceUrl: '原文链接须以 http:// 或 https:// 开头',
  articleSourceName: '填写原文链接时需要填写来源名称', category: '分类不存在', categoryInUse: '仍有文章使用该分类，不能删除，可改为停用',
  categoryFallback: 'English 名称必须填写（其他语言缺失时回退显示）', categoryNames: '分类名称语言不合法', categorySort: '排序权重须为整数', categoryEnabled: '状态不合法', articlePublishedAt: '请选择发布时间', articleFeatured: '首页推荐排序权重须为整数', articleStatus: '状态不合法', action: '不支持的操作',
}
export const errorText = error => errorLabels[error?.message || error] || String(error?.message || error || '操作失败')
