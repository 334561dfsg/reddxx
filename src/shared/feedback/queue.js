// Coalesce simultaneous field errors into one toast per interaction surface.
const pending=new Map()
let scheduled=false
export function queueFeedback(api,owner,text,type='error'){
 if(!text)return
 let batch=pending.get(owner)
 if(!batch){batch={api,type,messages:new Set()};pending.set(owner,batch)}
 batch.messages.add(text)
 if(scheduled)return
 scheduled=true
 queueMicrotask(()=>{
  scheduled=false
  for(const batch of pending.values())batch.api.open({key:'operation-feedback',type:batch.type,content:[...batch.messages].join('；'),duration:5})
  pending.clear()
 })
}
export function cancelFeedback(api){for(const [owner,batch] of pending)if(batch.api===api)pending.delete(owner)}
