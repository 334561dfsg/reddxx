import {computed,ref,toValue,watch} from 'vue'

// Site-wide list paging: 10 rows per page for tables/lists; card grids pass a multiple of their column count.
export function useFinancePagination(source,pageSize=10){
 const page=ref(1)
 const total=computed(()=>toValue(source).length)
 const pages=computed(()=>Math.max(1,Math.ceil(total.value/pageSize)))
 watch(pages,count=>{page.value=Math.min(page.value,count)},{flush:'sync'})
 const shown=computed(()=>toValue(source).slice((page.value-1)*pageSize,page.value*pageSize))
 return {page,total,pages,shown}
}
