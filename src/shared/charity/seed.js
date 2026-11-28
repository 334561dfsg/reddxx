import en from '../../../newtrend-website/src/locales/en-US/data.json' with {type: 'json'}
import zh from '../../../newtrend-website/src/locales/zh-TW/data.json' with {type: 'json'}
import fr from '../../../newtrend-website/src/locales/fr-FR/data.json' with {type: 'json'}
import de from '../../../newtrend-website/src/locales/de-DE/data.json' with {type: 'json'}
import ja from '../../../newtrend-website/src/locales/ja-JP/data.json' with {type: 'json'}
import ko from '../../../newtrend-website/src/locales/ko-KR/data.json' with {type: 'json'}
import {ASSET, LOCALES, createCharityState, money} from './domain.js'

// Seed: the public page's eight campaigns (newtrend-website/src/data.js `charity`), titled in all six languages from
// the site's locale files, plus a demo donation history. Each project's initial raised amount is the public snapshot
// minus the seeded donations, so raised totals match what the public page shows (70,777,391 USDT, 1,314,922 people).
// Dates are relative to page load.
const DAY = 86400000
const dictionaries = {'en-US': en, 'zh-TW': zh, 'fr-FR': fr, 'de-DE': de, 'ja-JP': ja, 'ko-KR': ko}
// [locale key, cover, raised, goal, people helped] in the public page's order.
const campaigns = [
  ['urgentAppealForGaza', 'b1537e7514a3cc70.jpg', 731030, 1000000, 3412],
  ['providingEducationFor500OrphansInGazaAndSyria', '005e1415d888f1af.jpg', 1351659, 1200000, 25461],
  ['bringReliefAndHopeToFamiliesInGazaSyria', 'b5aa1b0e22593c38.jpg', 754000, 1500000, 36414],
  ['ukraineCrisisReliefFund', '3dbc09fb490796a8.webp', 33372001, 75000000, 698511],
  ['hawaiiWildfireReliefFund', 'babb4b70af04fe7f.jpg', 33230000, 50000000, 524134],
  ['emergencyVeterinaryCareForPetsOfTheHomeless', '65681ba7a404b2c1.webp', 513200, 1000000, 21413],
  ['microcreditMarvelsEmpoweringWomen', '712786aa737e9396.jpg', 582301, 1000000, 3546],
  ['binanceLunchForChildrenKideNurseryAndPrim', 'cb92ce4e158dc5be.jpg', 243200, 600000, 2031],
]
export const seedUsers = {
  'USR-DEMO': {name: '演示用户', simulated: true},
  'USR-1002': {name: '模拟用户 1002', simulated: true},
  'USR-1003': {name: '模拟用户 1003', simulated: true},
  'USR-1004': {name: '模拟用户 1004', simulated: true},
}
// [days ago, user, campaign index, amount]
const history = [
  [0.1, 'USR-DEMO', 3, 50], [0.4, 'USR-1004', 4, 2000], [0.9, 'USR-1002', 0, 300], [1.2, 'USR-1003', 5, 20],
  [1.8, 'USR-DEMO', 1, 100], [2.5, 'USR-1004', 3, 5000], [3.1, 'USR-1002', 2, 800], [4, 'USR-1003', 7, 15],
  [5.2, 'USR-1004', 6, 1200], [6, 'USR-DEMO', 4, 30], [7.5, 'USR-1002', 3, 1000], [9, 'USR-1003', 0, 10],
  [11, 'USR-1004', 1, 2500], [13, 'USR-1002', 5, 150], [16, 'USR-DEMO', 2, 60], [20, 'USR-1004', 0, 3000],
]

export const seedProjectId = index => `CP-${String(index + 1).padStart(3, '0')}`

export function seedCharity(now = Date.now()) {
  const donations = history.map(([daysAgo, userId, index, amount], i) => {
    const key = campaigns[index][0]
    return {donationId: `CD-${String(history.length - i).padStart(5, '0')}`, userId, userName: seedUsers[userId].name, projectId: seedProjectId(index),
      projectTitle: en.ui[key], amount, asset: ASSET, status: 'completed', createdAt: Math.round(now - daysAgo * DAY)}
  })
  const projects = campaigns.map(([key, image, raised, targetAmount, peopleHelped], index) => {
    const donated = donations.filter(d => d.projectId === seedProjectId(index)).reduce((t, d) => t + d.amount, 0)
    return {
      projectId: seedProjectId(index),
      locales: Object.fromEntries(LOCALES.map(l => [l, {title: dictionaries[l].ui[key], summary: ''}])),
      image: `/NewQuantCapital/assets/${image}`, targetAmount, initialRaised: money(raised - donated), peopleHelped,
      minDonation: 1, maxDonation: 500000, sortOrder: (campaigns.length - index) * 10, status: 'listed',
      createdAt: now - 60 * DAY + index, version: 1, updatedAt: now - 60 * DAY,
    }
  })
  const s = createCharityState({projects, donations, stats: {baseRaised: 0, basePeopleHelped: 0, version: 1, updatedAt: now - 60 * DAY}})
  s.profiles = structuredClone(seedUsers)
  s.logs.unshift({id: 'CL-seed-boot', module: 'system', action: 'seed', refId: '', targetLabel: '公益频道', summary: '载入模拟数据', operator: '系统', createdAt: now})
  return s
}
