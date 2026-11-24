<script setup>
import { computed } from 'vue'
import { fmt } from '../data'
const props = defineProps({ rows: { type: Array, required: true }, paused: Boolean })
// Fixed slots keep live price/percentage changes from moving the loop boundary.
const itemWidth = 288
const pixelsPerSecond = 60
const trackStyle = computed(() => ({
  '--ticker-distance': `${props.rows.length * itemWidth}px`,
  '--ticker-duration': `${Math.max(1, props.rows.length * itemWidth / pixelsPerSecond)}s`,
  '--ticker-item-width': `${itemWidth}px`,
}))
</script>
<template>
  <div class="market-ticker" :class="{paused}" :style="trackStyle" tabindex="0" :aria-label="$t('home.ui.marketSnapshot')">
    <div class="market-ticker-track">
      <div v-for="copy in 2" :key="copy" class="market-ticker-group" :aria-hidden="copy===2 ? 'true' : undefined">
        <span v-for="m in rows" :key="m.id" class="market-ticker-item">
          <small>{{ $t(m.name) }}</small><b>{{ fmt(m.price) }}</b><strong :class="m.change<0?'negative':'positive'">{{ m.change>0?'+':'' }}{{ m.change.toFixed(2) }}%</strong><i aria-hidden="true">·</i>
        </span>
      </div>
    </div>
  </div>
</template>
<style scoped>
.market-ticker{height:50px;overflow:hidden;border-bottom:1px solid var(--nt-border);background:#080b10;display:flex;align-items:center}
.market-ticker:focus-visible{outline:2px solid var(--nt-accent);outline-offset:-2px}
.market-ticker-track{display:flex;flex:none;width:max-content;animation:market-ticker-scroll var(--ticker-duration) linear infinite;will-change:transform}
.market-ticker-group{display:flex;flex:none;width:var(--ticker-distance)}
.market-ticker-item{display:grid;grid-template-columns:76px 84px 56px 12px;gap:12px;align-items:center;padding:0 12px;width:var(--ticker-item-width);flex:none;white-space:nowrap;font-family:'IBM Plex Mono',monospace;font-size:.8125rem;font-variant-numeric:tabular-nums}
.market-ticker-item small{font:11px 'Exo 2',sans-serif;color:var(--nt-muted)}
.market-ticker-item b,.market-ticker-item strong{text-align:right}
.market-ticker-item strong{font-size:.75rem}.market-ticker-item i{text-align:center;color:var(--nt-muted)}
.market-ticker:hover .market-ticker-track,.market-ticker:focus-within .market-ticker-track,.paused .market-ticker-track{animation-play-state:paused}
@keyframes market-ticker-scroll{to{transform:translateX(calc(-1 * var(--ticker-distance)))}}
@media(prefers-reduced-motion:reduce){.market-ticker{overflow-x:auto}.market-ticker-track{animation:none;will-change:auto}.market-ticker-group[aria-hidden]{display:none}}
</style>
