<script setup>
import {computed,ref} from 'vue'
import LineIcon from '../ui/LineIcon.vue'
import {locale,languages,t} from '../../i18n'
// Language picker body (Overlay type 'language'), after the gmxx.io picker: a search field over the language list,
// the current language marked with a check. Choosing a language switches and closes (Overlay.changeLanguage).
defineEmits(['select'])
const query=ref('')
const visible=computed(()=>{const q=query.value.trim().toLowerCase();return languages.filter(([code,name])=>!q||name.toLowerCase().includes(q)||code.toLowerCase().includes(q))})
</script>
<template>
<div class="language-picker">
 <label class="language-search"><LineIcon name="search" aria-hidden="true"/><input v-model="query" type="search" autocomplete="off" :placeholder="$t('profile.center.preferences.searchLanguage')" :aria-label="$t('profile.center.preferences.searchLanguage')"/></label>
 <div class="language-list" role="list">
  <button v-for="[code,name] in visible" :key="code" type="button" role="listitem" :lang="code" :aria-current="locale===code?'true':undefined" :class="{current:locale===code}" @click="$emit('select',code)"><span>{{ name }}</span><LineIcon v-if="locale===code" name="check" class="language-check"/></button>
  <p v-if="!visible.length" class="language-empty">{{ t('profile.center.preferences.noLanguage') }}</p>
 </div>
</div>
</template>
<style scoped>
.language-picker{display:grid;gap:12px}
.language-search{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border:1px solid #ffffff1f;border-radius:12px;background:#0c0e10;color:#87888a}
.language-search:focus-within{background:#11151a}
.language-search svg{width:16px;height:16px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round}
.language-search input{flex:1;min-width:0;min-height:42px;border:0;background:transparent;color:#fff;font-size:14px;outline:none}
.language-search input::placeholder{color:#87888a}
.language-list{display:grid;gap:2px;max-height:min(360px,50vh);overflow-y:auto}
.language-list button{display:flex;align-items:center;justify-content:space-between;min-height:44px;padding:10px 12px;border-radius:10px;text-align:left;font-size:14px}
.language-list button:hover,.language-list button:focus-visible{outline:none;background:#ffffff0a}
.language-list button.current{color:var(--nt-accent);font-weight:600;background:#a5ff4a0f}
.language-check{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.language-empty{margin:0;padding:24px 0;text-align:center;color:#87888a;font-size:13px}
</style>
