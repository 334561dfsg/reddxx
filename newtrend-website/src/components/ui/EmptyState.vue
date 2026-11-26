<script setup>
import LineIcon from './LineIcon.vue'
// Shared empty list/panel state: inbox icon, message, optional hint and action (default slot).
// Wrapper classes (panel borders, spacing) pass through from the caller.
defineProps({text:{type:String,required:true},hint:String})
</script>
<template>
<div class="nt-empty" role="status">
 <span class="nt-empty-icon" aria-hidden="true"><LineIcon name="inbox"/></span>
 <p class="nt-empty-text">{{ text }}</p>
 <small v-if="hint" class="nt-empty-hint">{{ hint }}</small>
 <slot/>
</div>
</template>
<style>
.nt-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:40px 24px;text-align:center}
.nt-empty-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#ffffff0d;color:#87888a}
.nt-empty-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.nt-empty-text{margin:0;font-size:14px;line-height:20px;color:#87888a}
.nt-empty-hint{font-size:12px;line-height:18px;color:#6e6f71}
</style>
