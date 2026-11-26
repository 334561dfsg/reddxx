import {createStrategyService} from '../src/shared/strategy/service.js'
// Shared AI strategy Mock: GET /api/mock/strategy returns the state, POST {action,args} runs one command.
export function strategyMockPlugin() {
 const service=createStrategyService()
 const middleware=async(req,res,next)=>{
  if((req.url||'').split('?')[0]!=='/api/mock/strategy')return next()
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store')
  try {
   if(req.method==='GET')return res.end(JSON.stringify(service.read()))
   if(req.method!=='POST'){res.statusCode=405;return res.end('{}')}
   let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)throw new Error('request')}
   const {action,args}=JSON.parse(body)
   res.end(JSON.stringify(service.command(action,args)))
  }catch(error){res.statusCode=400;res.end(JSON.stringify({error:error.message}))}
 }
 return {name:'strategy-mock',configureServer(server){server.middlewares.use(middleware)},configurePreviewServer(server){server.middlewares.use(middleware)}}
}
