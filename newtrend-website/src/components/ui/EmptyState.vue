<script setup>
// Shared empty list/panel state: inbox icon, message, optional hint and action (default slot).
// Wrapper classes (panel borders, spacing) pass through from the caller.
defineProps({text:{type:String,required:true},hint:String})
</script>
<template>
<div class="nt-empty" role="status">
 <span class="nt-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11"/></svg></span>
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
