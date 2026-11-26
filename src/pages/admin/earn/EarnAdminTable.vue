<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { Card, Descriptions, DescriptionsItem, List, ListItem, Pagination, Table } from 'ant-design-vue'
const props = defineProps({ title: {type:String,required:true}, rows: {type:Array,default:()=>[]}, columns: {type:Array,default:()=>[]}, page: {type:Number,default:1}, rowKey:{type:[String,Function],default:'id'}, desktopOnly:Boolean, loading:Boolean })
const emit = defineEmits(['update:page'])
const media = window.matchMedia('(min-width: 1200px)'), wide = ref(media.matches)
const sync = e => { wide.value = e.matches }; media.addEventListener('change',sync)
onBeforeUnmount(() => media.removeEventListener('change',sync))
const paged = computed(() => props.rows.slice((props.page-1)*10,props.page*10))
</script>
<template>
 <Card :title="title" :bordered="false">
 <template v-if="$slots.toolbar" #extra><slot name="toolbar"/></template>
 <Table v-if="wide||desktopOnly" :loading="loading" :columns="columns" :data-source="rows" :row-key="rowKey" :pagination="{current:page,pageSize:10,total:rows.length,showSizeChanger:false,showTotal:total=>'共 '+total+' 条',position:['bottomRight'],onChange:value=>emit('update:page',value)}" size="middle" :locale="{emptyText:'暂无记录'}" :scroll="{x:columns.reduce((total,column)=>total+(column.width||160),0)}"><template #bodyCell="{column,record}"><slot name="cell" :column="column" :record="record">{{ record[column.key] ?? '—' }}</slot></template></Table>
 <List v-else :data-source="paged" :locale="{emptyText:'暂无记录'}"><template #renderItem="{item}"><ListItem><div class="earn-compact-record"><Descriptions :column="1" size="small"><DescriptionsItem v-for="column in columns.filter(c=>c.key!=='actions')" :key="column.key" :label="column.title"><slot name="cell" :column="column" :record="item">{{ item[column.key] ?? '—' }}</slot></DescriptionsItem></Descriptions><div v-if="columns.some(c=>c.key==='actions')" class="earn-compact-actions"><slot name="cell" :column="{key:'actions'}" :record="item"/></div></div></ListItem></template></List>
 <Pagination v-if="!wide&&!desktopOnly&&rows.length" class="earn-pagination" :current="page" :total="rows.length" :page-size="10" :show-size-changer="false" :show-total="total=>'共 '+total+' 条'" @change="emit('update:page',$event)"/>
 </Card>
</template>
<style scoped>.earn-compact-record{min-width:0;width:100%;overflow-wrap:anywhere}.earn-compact-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}.earn-pagination{margin-top:20px;text-align:right}</style>
