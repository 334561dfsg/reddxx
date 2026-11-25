import {createLendingService} from '../src/shared/lending/service.js'
export function lendingMockPlugin() {
 const service=createLendingService()
 const middleware=async(req,res,next)=>{
  if((req.url||'').split('?')[0]!=='/api/mock/lending')return next()
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store')
  try {
   if(req.method==='GET')return res.end(JSON.stringify(service.read()))
   if(req.method!=='POST'){res.statusCode=405;return res.end('{}')}
   let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)throw new Error('request')}
   const {action,args}=JSON.parse(body)
   res.end(JSON.stringify(service.command(action,args)))
  }catch(error){res.statusCode=400;res.end(JSON.stringify({error:error.message}))}
 }
 return {name:'lending-mock',configureServer(server){server.middlewares.use(middleware)},configurePreviewServer(server){server.middlewares.use(middleware)}}
}
