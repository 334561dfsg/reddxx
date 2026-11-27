<script setup>
// Amount input plus the percentage shortcuts used by every order panel. It renders the same label/input and
// .percentages markup the form always had (two roots), so trade-workspace.css and trade-form-controls.css apply.
// `suffix` adds the spot layout: the input wrapped in .spot-amount-field with the unit shown inside it.
import {computed} from 'vue'

const props=defineProps({
 id:String,
 label:String,
 unit:String,
 modelValue:[String,Number],
 percentages:{type:Array,default:()=>[25,50,75,100]},
 invalid:Boolean,
 describedby:String,
 disabled:Boolean,
 suffix:Boolean,
})
const emit=defineEmits(['update:modelValue','percent','input'])
// A writable computed keeps native v-model behaviour (IME composition) on the inner input.
const value=computed({get:()=>props.modelValue,set:next=>emit('update:modelValue',next)})
</script>

<template>
  <label>
    {{ label }} ({{ unit }})
    <span v-if="suffix" class="spot-amount-field">
      <input
        :id="id"
        v-model="value"
        class="trade-field"
        inputmode="decimal"
        :placeholder="$t('trade.enterQuantity')"
        :disabled="disabled"
        :aria-invalid="invalid"
        :aria-describedby="describedby"
        @input="emit('input',$event)"
      />
      <span aria-hidden="true">{{ unit }}</span>
    </span>
    <input
      v-else
      :id="id"
      v-model="value"
      class="trade-field"
      inputmode="decimal"
      :placeholder="$t('trade.enterQuantity')"
      :disabled="disabled"
      :aria-invalid="invalid"
      :aria-describedby="describedby"
      @input="emit('input',$event)"
    />
  </label>
  <div class="percentages">
    <button v-for="n in percentages" :key="n" :disabled="disabled" @click="emit('percent',n)">{{ n }}%</button>
  </div>
</template>

