// One KYC status for every account surface (header menu, mobile drawer, profile) — review 2026-11-27; they used to
// disagree on 'verified' and on the pending label. Returns the label key, a tone and whether identity is verified.
export function kycStatus(account) {
  const verified = account.kyc === 'approved' || account.kyc === 'verified'
  if (verified) return account.advanced === 'pending' ? {key: 'common.kycAdvancedPending', tone: 'secondary', verified} : {key: 'common.kycVerified', tone: 'success', verified}
  if (account.kyc === 'pending') return {key: 'common.kycPending', tone: 'secondary', verified}
  return {key: 'common.kycUnverified', tone: 'danger', verified}
}
