<script setup>
import Icon from '../Icon.vue'
import {locale,languages} from '../../i18n'
defineEmits(['select'])
</script>
<template><div class="language-list"><button v-for="[code,name] in languages" :key="code" @click="$emit('select',code)">{{ $t(name) }}<Icon v-if="locale===code" name="check" green/></button></div></template>
<style scoped>.language-list{display:grid;gap:4px}.language-list button{display:flex;align-items:center;justify-content:space-between;padding:16px 12px;text-align:left;border-radius:var(--nt-radius-panel)}.language-list button:hover{background:#ffffff08}</style>
