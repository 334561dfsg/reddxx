// Regulatory information (/regulatory-information and /content/regulation-*). Data comes from the shared regulatory
// module through platform/regulatoryClient.js: published entries only, in the request language with English fallback.
// The module runs in this page's memory (static mock): what an admin publishes is not visible to other viewers until a
// real backend replaces this service.
import {regulatoryService, publicList, publicEntry, slugOf, entryIdOf} from '../platform/regulatoryClient.js'
import {ApiError, mockCall, snapshot} from './transport.js'

const state = () => regulatoryService().read()
const withSlug = entry => ({...entry, slug: slugOf(entry.entryId)})

/** GET /regulatory — published entries by sort weight (larger first), each with its public slug. */
export const listRegulatory = locale => mockCall('regulatory', () => snapshot(publicList(state(), locale).map(withSlug)))

/** GET /regulatory/:slug — one published entry (slug regulation-<code>); ApiError('notFound') otherwise. */
export const getRegulatory = (slug, locale) => mockCall('regulatory', () => {
  const id = entryIdOf(slug), entry = id && publicEntry(state(), id, locale)
  if (!entry) throw new ApiError('notFound')
  return snapshot(withSlug(entry))
})
