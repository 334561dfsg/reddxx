import {computed,ref,toValue,watch} from 'vue'
import {useMediaQuery} from './useMediaQuery.js'

// Site-wide list paging: 10 rows per page for tables/lists; card grids pass a multiple of their column count.
// Phones (≤767px, user decision 2026-11-27): the list loads on scroll instead — `shown` keeps every page up to the
// current one, and FinancePagination (with `scroll`) advances `page` when its sentinel comes into view. Desktop pages.
export function useFinancePagination(source,pageSize=10){
 const page=ref(1)
 const phone=useMediaQuery('(max-width: 767px)')
 const total=computed(()=>toValue(source).length)
 const pages=computed(()=>Math.max(1,Math.ceil(total.value/pageSize)))
 watch(pages,count=>{page.value=Math.min(page.value,count)},{flush:'sync'})
 // A breakpoint change keeps the page (responsive rule 3): phones show every row up to it, desktop shows that page.
 const shown=computed(()=>toValue(source).slice(phone.value?0:(page.value-1)*pageSize,page.value*pageSize))
 return {page,total,pages,shown,phone}
}
