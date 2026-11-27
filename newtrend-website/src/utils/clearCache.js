import {message} from 'ant-design-vue'
import {openModal} from '../session'
import {invalidateAll} from '../composables/useRequest.js'
import {t} from '../i18n'

// 清除快取 confirmation, shared by the header profile menu and the mobile drawer: refreshes every live request.
export function openClearCache() {
  openModal('account-confirm', 'profile.center.clearCache.title', {
    description: 'profile.center.clearCache.description', confirmLabel: 'profile.center.clearCache.confirm',
    onConfirm: () => { invalidateAll(); message.success(t('profile.center.clearCache.done')) },
  })
}
