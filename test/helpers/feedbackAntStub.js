import {defineComponent,h,ref} from 'vue'
export const ConfigProvider=defineComponent({inheritAttrs:false,setup(_, {slots}){return ()=>slots.default?.()}})
export const message={useMessage(){
 const notice=ref(null)
 return [{open(value){notice.value=value},destroy(){notice.value=null}},()=>notice.value?h('div',{'role':'alert','data-testid':'feedback-toast'},notice.value.content):null]
}}
