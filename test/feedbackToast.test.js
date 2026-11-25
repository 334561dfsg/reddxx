import assert from 'node:assert/strict'
import test from 'node:test'
import {ref} from 'vue'
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {feedbackViolations} from '../scripts/check-feedback.mjs'
import {queueFeedback,cancelFeedback} from '../src/shared/feedback/queue.js'
import {createSfcHarness,loadVueSfc} from './helpers/vueSfcHarness.js'

test('feedback audit rejects inline operation errors and preserves business content',()=>{
 const s=body=>`<template>${body}</template>`
 assert.equal(feedbackViolations(s('<p v-if="error" role="alert">{{error}}</p>'),'page.vue').length,1)
 assert.equal(feedbackViolations(s('<Alert type="success" :message="notice"/>'),'page.vue').length,1)
 assert.deepEqual(feedbackViolations(s('<FeedbackToast v-if="error" :source="()=>error"/>'),'page.vue'),[])
 assert.deepEqual(feedbackViolations(s('<Tag>待审核</Tag><Empty/>'),'page.vue'),[])
})

test('simultaneous validation errors are deduplicated within one surface, not across dialogs',async()=>{
 const events=[],a={open:v=>events.push(['a',v])},b={open:v=>events.push(['b',v])},ownerA={},ownerB={}
 queueFeedback(a,ownerA,'金额不合法');queueFeedback(a,ownerA,'金额不合法');queueFeedback(a,ownerA,'请选择币种');queueFeedback(b,ownerB,'加载失败')
 await Promise.resolve()
 assert.equal(events.length,2)
 assert.equal(events[0][1].content,'金额不合法；请选择币种')
 assert.equal(events[1][1].content,'加载失败')
 queueFeedback(a,ownerA,'已关闭的弹窗');cancelFeedback(a);await Promise.resolve()
 assert.equal(events.length,2)
})

test('reactive adapter keeps accessible descriptions, repeats failed attempts, and retains recovery controls',async t=>{
 const error=ref('金额不合法')
 const component=await loadVueSfc(resolve('src/shared/feedback/FeedbackToast.vue'),{vueImports:{'ant-design-vue':pathToFileURL(resolve('test/helpers/feedbackAntStub.js')).href}})
 const harness=await createSfcHarness(component,{source:()=>error.value,id:'amount-error'})
 t.after(harness.cleanup)
 await harness.flush();await harness.flush()
 const description=harness.allNodes().find(n=>n.getAttribute?.('id')==='amount-error')
 assert.equal(description.classList.contains('feedback-accessible-description'),true)
 assert.equal(description.getAttribute('role'),null)
 assert.match(harness.findByTestId('feedback-toast').textContent,/金额不合法/)
 error.value='';error.value='金额不合法';await harness.flush();await harness.flush()
 assert.match(harness.findByTestId('feedback-toast').textContent,/金额不合法/)
 error.value='余额不足';await harness.flush();await harness.flush()
 assert.match(harness.findByTestId('feedback-toast').textContent,/余额不足/)
})
