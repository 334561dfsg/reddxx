<script setup>
import {useRouter} from 'vue-router'
import Icon from '../../components/Icon.vue'
import {account} from '../../account'
import {openModal,logout} from '../../session'
import {path} from '../../data'
const router=useRouter()
function rename(d){openModal('account-edit','devices.renameTitle',{value:d.name,onSave:v=>d.name=v})}
function revoke(d){openModal('account-confirm','devices.revokeTitle',{description:d.current?'devices.revokeCurrentWarning':'devices.revokeBody',onConfirm:()=>{account.devices=account.devices.filter(x=>x.id!==d.id);if(d.current){logout();router.push(path('/login'))}}})}
</script>
<template><div v-if="!account.devices.length" class="empty">{{ $t("devices.empty") }}</div><article v-for="d in account.devices" :key="d.id" class="card account-device"><div class="summary-line"><div><h3>{{ d.name }}</h3><p class="muted">{{ $t(d.current?"devices.current":'') }} {{ $t(d.trusted?"devices.trusted":'') }}</p><p class="mini-label">{{ $t("Local browser · 2026-11-24") }}</p></div><Icon name="layers"/></div><div class="device-actions"><button @click="rename(d)">{{ $t("devices.rename") }}</button><button :disabled="d.trusted" @click="d.trusted=true">{{ $t("devices.trust") }}</button><button class="negative" @click="revoke(d)">{{ $t("devices.revoke") }}</button></div></article></template>
