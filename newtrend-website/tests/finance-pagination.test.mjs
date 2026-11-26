import test from 'node:test'
import assert from 'node:assert/strict'
import {effectScope,ref} from 'vue'
import {useFinancePagination} from '../src/composables/useFinancePagination.js'

test('pagination preserves order and clamps the current page when records shrink',()=>{
 const scope=effectScope()
 scope.run(()=>{
  const rows=ref(Array.from({length:14},(_,i)=>i))
  const paging=useFinancePagination(rows,6)
  paging.page.value=3
  assert.deepEqual(paging.shown.value,[12,13])
  rows.value=rows.value.slice(0,8)
  assert.equal(paging.page.value,2)
  assert.deepEqual(paging.shown.value,[6,7])
  rows.value=[]
  assert.equal(paging.page.value,1)
  assert.equal(paging.pages.value,1)
  assert.deepEqual(paging.shown.value,[])
 })
 scope.stop()
})

test('pagination defaults to 10 rows per page for site lists',()=>{
 const scope=effectScope()
 scope.run(()=>{
  const paging=useFinancePagination(ref(Array.from({length:23},(_,i)=>i)))
  assert.equal(paging.pages.value,3)
  assert.deepEqual(paging.shown.value,[0,1,2,3,4,5,6,7,8,9])
  paging.page.value=3
  assert.deepEqual(paging.shown.value,[20,21,22])
 })
 scope.stop()
})
