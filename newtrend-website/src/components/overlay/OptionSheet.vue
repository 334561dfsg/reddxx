<script setup>
import LineIcon from '../ui/LineIcon.vue'
// Generic single-choice bottom sheet body (Overlay type 'option-sheet', GMXX mobile reference): one row per option,
// the current one highlighted with a check. Choosing reports the value; the overlay closes, then applies it.
defineProps({options:{type:Array,required:true},current:[String,Number]})
defineEmits(['select'])
</script>
<template>
<div class="option-sheet" role="list">
 <button v-for="o in options" :key="o.value" type="button" role="listitem" :aria-current="o.value===current?'true':undefined" :class="{current:o.value===current}" @click="$emit('select',o.value)"><span>{{ o.label }}</span><LineIcon v-if="o.value===current" name="check" class="option-check"/></button>
</div>
</template>
<style scoped>
.option-sheet{display:grid;gap:2px}
.option-sheet button{display:flex;align-items:center;justify-content:space-between;min-height:48px;padding:10px 12px;border-radius:10px;text-align:left;font-size:15px;color:#fff}
.option-sheet button:hover,.option-sheet button:focus-visible{outline:none;background:#ffffff0a}
.option-sheet button.current{color:var(--nt-accent);font-weight:600;background:#a5ff4a0f}
.option-check{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
</style>
