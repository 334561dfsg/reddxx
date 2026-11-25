/** A term owns its daily percentage rate; APR is derived, never independently saved. */
export const annualLoanRate = rate => Math.round(rate * 365 * 1e8) / 1e8
export function normalizeLoanTerms(value) {
 if(!Array.isArray(value)||!value.length)throw new Error('terms')
 const byDays=new Map()
 for(const term of value){
  if(!term||!Number.isSafeInteger(term.days)||term.days<1)throw new Error('terms')
  if(typeof term.dailyRate!=='number'||!Number.isFinite(term.dailyRate)||term.dailyRate<0||term.dailyRate>100)throw new Error('termRate')
  if(byDays.has(term.days)&&byDays.get(term.days).dailyRate!==term.dailyRate)throw new Error('duplicateTerm')
  byDays.set(term.days,{days:term.days,dailyRate:term.dailyRate})
 }
 return [...byDays.values()].sort((a,b)=>a.days-b.days)
}
export function loanRateRange(terms=[],annual=false){
 const values=terms.map(t=>annual?annualLoanRate(t.dailyRate):t.dailyRate)
 if(!values.length)return '—'
 const format=n=>new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:annual?2:8}).format(n)
 const min=Math.min(...values),max=Math.max(...values)
 return min===max?format(min):`${format(min)} – ${format(max)}`
}
