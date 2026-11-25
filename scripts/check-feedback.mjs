import {readFileSync,readdirSync} from 'node:fs'
import {join} from 'node:path'
import {parse} from '@vue/compiler-sfc'

// Decision content and historical data are not transient operation feedback.
const exceptions=new Map([
 ['src/components/verification/VerificationRequiredBanner.vue','Verification access requirements and navigation'],
 ['src/pages/admin/delivery/DeliveryManagementPage.vue#contractDiscardConfirmVisible','Explicit unsaved-work confirmation'],
 ['src/pages/admin/user/UserDepositReportPage.vue#record.error','Historical export failure detail'],
])
export function feedbackViolations(source,file){
 const {descriptor,errors}=parse(source,{filename:file})
 if(errors.length)return errors.map(e=>`${file}: ${e.message}`)
 const found=[]
 function walk(node){
  if(node.type===1){
   const attr=name=>node.props.find(p=>p.type===6&&p.name===name)?.value?.content||''
   const condition=node.props.find(p=>p.type===7&&['if','else-if'].includes(p.name))?.exp?.content||''
   const classBinding=node.props.find(p=>p.type===7&&p.name==='bind'&&p.arg?.content==='class')?.exp?.content||''
   const klass=attr('class')+' '+classBinding
   const hasFeedbackRole=attr('role')==='alert'&&!!condition
   const alert=['Alert','a-alert'].includes(node.tag)&&['error','success'].includes(attr('type'))
   const styledFeedback=condition&&/(form-error|form-success|c2c-error|c2c-success|record-notice)/.test(klass)
   const errorText=condition&&/(error|invalid|conflict)/i.test(condition)&&/(rose|red|negative|error)/.test(klass)&&['p','span','div'].includes(node.tag)
   if((hasFeedbackRole||alert||styledFeedback||errorText)&&!exceptions.has(file)&&!exceptions.has(`${file}#${condition}`))found.push(`${file}:${node.loc.start.line} embedded feedback; use toast`)
  }
  node.children?.forEach(walk)
 }
 if(descriptor.template)walk(descriptor.template.ast)
 return found
}
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(dir,entry.name)):entry.name.endsWith('.vue')?[join(dir,entry.name)]:[])}
if(process.argv[1]?.endsWith('check-feedback.mjs')){
 const paths=[...files('src'),...files('newtrend-website/src'),...files('交易v2/src')]
 const issues=paths.flatMap(file=>feedbackViolations(readFileSync(file,'utf8'),file))
 if(issues.length){console.error(issues.join('\n'));process.exitCode=1}else console.log(`Feedback check passed: ${paths.length} Vue surfaces scanned`)
}
