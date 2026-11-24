export const deliveryPeriods=[[30,7],[60,15],[120,20],[86400,30],[172800,35],[345600,40],[604800,50],[1296000,60]]
export const leverageOptions=[1,25,50,75,100,125,150,175,200]
export const tradeFeeRate=.0005
export function orderEstimate({kind,side='buy',amount,price,leverage=1,rate=0}){
 const value=Math.max(0,Number(amount)||0),p=Number(price),valid=Number.isFinite(p)&&p>0
 const notional=kind==='spot'&&side==='sell'?(valid?value*p:0):value
 return {quantity:kind==='options'?value:valid?(kind==='spot'&&side==='sell'?value:value/p):0,
  notional,margin:kind==='futures'?notional/Number(leverage):0,
  fee:kind==='options'?0:notional*tradeFeeRate,expected:kind==='options'?value*rate/100:0}
}
export function validStops(side,price,tp,sl){
 if(tp!==''&&(!Number.isFinite(Number(tp))||Number(tp)<=0||(side==='buy'?Number(tp)<=price:Number(tp)>=price)))return false
 if(sl!==''&&(!Number.isFinite(Number(sl))||Number(sl)<=0||(side==='buy'?Number(sl)>=price:Number(sl)<=price)))return false
 return tp!==''||sl!==''
}
