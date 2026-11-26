<script setup>
// 消息通知, after gmxx.io/personal?type=notifications: category tabs (全部 / 安全 / 系統 / 活動), mark-all-read,
// message cards with an unread dot, and pagination. Opening a card marks it read. Profile API (local mock); the
// header bell's unread badge refreshes through the 'notifications' tag.
import {computed,ref,watch} from 'vue'
import {message} from 'ant-design-vue'
import Skeleton from '../../components/ui/Skeleton.vue'
import RequestState from '../../components/ui/RequestState.vue'
import FinancePagination from '../../components/FinancePagination.vue'
import LineIcon from '../../components/ui/LineIcon.vue'
import {t} from '../../i18n'
import {NOTIFICATION_CATEGORIES,listNotifications,markAllNotificationsRead,markNotificationRead,profileErrorKey} from '../../api/profile.js'
import {invalidate,useMutation,useRequest} from '../../composables/useRequest.js'
const PAGE_SIZE = 8
const category = ref(''), page = ref(1)
watch(category, () => { page.value = 1 })
const list = useRequest(() => listNotifications({category: category.value, page: page.value, pageSize: PAGE_SIZE}), {key: () => category.value + '|' + page.value, tags: ['notifications']})
const tabs = computed(() => [['', 'profile.center.notifications.all'], ...NOTIFICATION_CATEGORIES.map(key => [key, 'profile.center.notifications.categories.' + key])])
const markAll = useMutation(markAllNotificationsRead), markOne = useMutation(markNotificationRead)
async function readAll() {
  if (markAll.pending.value) return
  try {
    const {changed} = await markAll.run({category: category.value})
    message.success(t(changed ? 'profile.center.notifications.markedAllRead' : 'profile.center.notifications.nothingUnread'))
    invalidate('notifications')
  } catch (cause) { message.error(t(profileErrorKey(cause))) }
}
async function open(item) {
  if (item.read) return
  try { await markOne.run(item.id); invalidate('notifications') } catch (cause) { message.error(t(profileErrorKey(cause))) }
}
const time = value => { const d = new Date(value), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}` }
</script>
<template>
<header class="pc-notice-head">
 <div><h1 class="pc-title">{{ $t('profile.center.notifications.title') }}</h1><p class="pc-subtitle">{{ $t('profile.center.notifications.subtitle') }}</p></div>
</header>
<div class="pc-notice-bar">
 <div class="pc-tabs" role="tablist" :aria-label="$t('profile.center.notifications.title')">
  <button v-for="[key, label] in tabs" :key="key" type="button" role="tab" :aria-selected="category===key" :class="{active: category===key}" @click="category=key">{{ $t(label) }}</button>
 </div>
 <button type="button" class="pc-text-button" :disabled="markAll.pending.value||!list.data.value?.unread" :aria-busy="markAll.pending.value||undefined" @click="readAll">{{ $t('profile.center.notifications.markAllRead') }}</button>
</div>
<RequestState :status="list.status.value" :error="list.error.value" class="pc-card" @retry="list.refresh">
 <template #loading><div class="pc-notices"><div v-for="n in 4" :key="n" class="pc-card pc-notice"><div class="pc-notice-top"><Skeleton inline width="180px"/><Skeleton inline width="110px"/></div><p><Skeleton inline width="85%"/></p><small><Skeleton inline width="48px"/></small></div></div></template>
 <div v-if="list.data.value.items.length" class="pc-notices" role="tabpanel">
  <button v-for="item in list.data.value.items" :key="item.id" type="button" class="pc-card pc-notice" :class="{unread: !item.read}" @click="open(item)">
   <span class="pc-notice-top"><strong><span v-if="!item.read" class="pc-dot" aria-hidden="true"></span><span v-if="!item.read" class="sr-only">{{ $t('profile.center.notifications.unread') }}</span>{{ $t('profile.center.notifications.kinds.'+item.kind+'.title', item.params) }}</strong><time :datetime="new Date(item.createdAt).toISOString()">{{ time(item.createdAt) }}</time></span>
   <span class="pc-notice-body">{{ $t('profile.center.notifications.kinds.'+item.kind+'.body', item.params) }}</span>
   <small class="pc-notice-tag">{{ $t('profile.center.notifications.categories.'+item.category) }}</small>
  </button>
 </div>
 <div v-else class="pc-card pc-empty"><LineIcon name="inbox"/>{{ $t('profile.center.notifications.empty') }}</div>
 <FinancePagination v-model:page="page" :total="list.data.value.total" :page-size="PAGE_SIZE"/>
</RequestState>
</template>
