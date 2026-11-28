// 监管资讯 shared module (src/shared/regulatory, managed in the admin 内容管理 → 监管资讯). In-page static mock:
// the public site and the admin each run their own instance, so admin edits do not reach other viewers.
export {regulatoryService} from '../../../src/shared/regulatory/service.js'
export {publicList, publicEntry, slugOf, entryIdOf} from '../../../src/shared/regulatory/domain.js'
export {sanitizeHtml} from '../../../src/shared/news/html.js'
