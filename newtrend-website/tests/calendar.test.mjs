import test from 'node:test'
import assert from 'node:assert/strict'
import {dateKey,parseDate,monthDays,shiftMonth} from '../src/utils/calendar.js'
test('calendar uses Sunday-first complete weeks and adjacent month dates',()=>{const days=monthDays(2026,10);assert.equal(days.length,35);assert.equal(days[0].getDay(),0);assert.equal(dateKey(days[0]),'2026-11-01');assert.equal(dateKey(days.at(-1)),'2026-12-05')})
test('six-week months and leap dates are valid',()=>{assert.equal(monthDays(2026,7).length,42);assert.equal(dateKey(parseDate('2024-02-29')),'2024-02-29');assert.equal(parseDate('2026-02-29'),null)})
test('month keyboard navigation clamps end of month and crosses years',()=>{assert.equal(dateKey(shiftMonth(parseDate('2026-01-31'),1)),'2026-02-28');assert.equal(dateKey(shiftMonth(parseDate('2026-01-15'),-1)),'2025-12-15')})
