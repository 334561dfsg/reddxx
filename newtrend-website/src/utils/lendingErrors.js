// Lending mock API codes that have translations under `lending.errors.*`. Anything else — network
// failures ("Failed to fetch"), unexpected server codes — falls back to the generic unavailable message.
const KNOWN = new Set(['amount','term','balance','liquidity','product','collateral','duplicate','status','order','threshold','owner','busy','unavailable','login','rateChanged','verificationRequired','vipRequired'])
export const lendingErrorKey = code => 'lending.errors.' + (KNOWN.has(code) ? code : 'unavailable')
