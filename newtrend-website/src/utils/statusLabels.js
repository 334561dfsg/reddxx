// Status label namespaces per domain, shared by StatusTag and any filter/list that names a status.
export const statusDomains = {
  earn: {look: 'portfolio-status', labels: 'earn.myEarnings.status.'},
  lending: {look: 'portfolio-status', labels: 'lending.statuses.'},
  'quant-fund': {look: 'qf-status', labels: 'aiQuant.quantFund.positions.tabs.'},
  strategy: {look: 'ms-status', labels: 'aiQuant.status.'},
}
/** Translation key for a domain status, e.g. statusLabelKey('lending', 'active') → 'lending.statuses.active'. */
export const statusLabelKey = (domain, status) => statusDomains[domain].labels + status
