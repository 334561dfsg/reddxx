# 监管资讯后台（2026-11-28）

新前端的「监管资讯」（`/NewQuantCapital/regulatory-information`，页脚「风险与合规」）目前是写死的 5 个链接（SEC、SFC、GFSOB、FSRA、FMSB），每个链接打开 `content/documents/<语言>.json` 里的一篇文档（标题 + 正文段落 + 一张牌照图片）。本次在「内容管理」下新增「监管资讯」，让运营在后台新增、编辑、上传附件、发布和下线这些条目。

| 菜单 | 路由 | 内容 |
|---|---|---|
| 监管资讯 | `/admin/regulatory`，`/admin/regulatory/new`，`/admin/regulatory/:id/edit` | 列表（标题、状态分字段搜索；发布、下线确认）+ 单页编辑器（不用弹窗） |

菜单位置：内容管理 → 新闻文章、新闻分类、**监管资讯**、新闻资讯（旧前台）。

## 数据

共享模块 `src/shared/regulatory/{domain,seed,service,client}.js`，页面内静态数据（刷新重置，不做浏览器持久化）；前台读同一模块，但各页面各一份实例，不跨页面同步（见「前台展示」）。

- 一个条目 = 每种语言一个标题 + 一个大的在线编辑器正文，加附件和排序权重。**不单独设置监管机构、牌照编号、司法管辖区等字段**（用户决定 2026-11-28：「就是一个大的在线编辑器」），这些信息直接写在正文里，与现有前台文档的写法一致。
- 语言：English、繁體中文、Français、Deutsch、日本語、한국어，English 排第一且必填（标题 + 正文），其他语言要么标题和正文都填，要么留空回退到 English。
- 正文用新闻的简单富文本编辑器（H2、正文、加粗、斜体、列表），编辑区加高；保存时按新闻的白名单清洗（`src/shared/news/html.js`）。
- 附件：Ant Design Vue `Upload`，PDF / JPG / PNG / WebP，单个 ≤ 10MB，最多 10 个。文件不上传到任何服务器，保存为页面内存中的 object URL（`URL.createObjectURL`）加文件名、类型、大小、上传时间；离开编辑器时释放未保存的 object URL。附件可预览（新标签页打开）和移除。不合规的文件用 toast 提示，同一次选择的多个错误合并为一条。
- 排序权重：数值越大越靠前，同权重按 id 稳定排序；新条目默认取当前最大值 + 10。
- 状态：新条目默认「未发布」；保存不改变发布状态；发布 / 下线只在列表操作列，带确认弹窗、版本校验（stale）和状态校验。
- 每次保存、发布、下线都记录操作日志（before / after 全量快照，操作人为「管理员（模拟）」，自动生成的说明列出改动的语言、排序权重和附件增删），requestId 防重复提交。没有操作日志页面（与新闻一致）。
- 种子：前台现有 5 篇（SEC、SFC、GFSOB、FSRA、FMSB），按前台顺序给排序权重 50…10，6 种语言的标题和正文取自前台文档 JSON，文档中的牌照图片转为附件（`/NewQuantCapital/assets/...`，带真实文件大小），默认已发布。

## 前台展示（2026-11-28 接入）

用户要求「我发布之后别人也要看，原型上有对应的展示就行」。前台 `newtrend-website/src/pages/Legal.vue` 的监管资讯索引页和 `/content/regulation-*` 详情页改为读取共享模块：

- 调用链：`src/api/regulatory.js`（`listRegulatory(locale)`、`getRegulatory(slug, locale)`，走 `mockCall('regulatory')`）→ `src/platform/regulatoryClient.js` → `src/shared/regulatory/*`。
- 只显示已发布条目，当前语言，逐字段回退 English；索引按排序权重（大在前）。
- 地址：`slugOf('REG-SEC') = 'regulation-sec'`，`entryIdOf` 反向解析，所以旧链接 `/content/regulation-sec` 等继续有效；新条目为 `/content/regulation-<时间戳-序号>`。未知或未发布 → 「找不到頁面」+ 返回监管资讯。
- 详情：标题、正文（渲染前再按白名单清洗）、图片附件内联显示、PDF 等文件附件以「附件」列表的链接显示（类型 · 大小）、返回链接。
- 加载用与正式布局同尺寸的骨架（索引行高 67px，已逐行比对无位移）；失败用 toast + 重試（`RequestState`）。文案在新的 `locales/*/regulatory.json`。
- 其他法律页面（关于、隐私、协议等）仍读打包的文档 JSON，未改动。

**限制（必须说明）**：模块仍是页面内静态 mock，无服务器、无浏览器存储。后台和前台各自在自己的页面内存里运行一份，后台的发布/编辑**不会**被其他访问者看到，刷新也会重置。真正的「发布后别人可见」需要后端接口替换 `mockCall` 内部实现（页面无需改动）。

## 验证

- `test/regulatoryDomain.test.js`：种子、默认未发布、保存不发布、发布/下线状态与版本校验、日志 before/after、English 回退、语言版本完整性、附件类型/大小/数量/地址校验、正文清洗、重复请求、服务只在内存。
- `test/frontHomeNews.test.js`：内容管理菜单顺序与三条路由。
- `newtrend-website/tests/regulatory-api.test.mjs`：索引顺序与旧 slug、详情附件、未知/未发布 notFound、故障注入。
- 前台浏览器（1440 与 393）：索引骨架与加载后行位置一致、SFC/FSRA 详情、未知 slug 找不到、`?mock-fail=regulatory` 显示 toast + 重試，无横向滚动，无控制台错误。
- 后台浏览器（1440×900 桌面）：列表加载 5 条种子、表格不横向滚动；下线确认 + toast；新增（标题、正文、上传 PDF、拒绝 zip）→ 保存后为未发布并按权重排第一 → 发布；编辑种子条目、未保存离开确认。

## 未做 / 未验证

- 后台发布不会跨用户、跨页面生效（见上文限制）。
- 前台文件类附件（PDF 链接）只在接口测试中验证，种子数据里没有 PDF，浏览器中未目视检查。
- 图片附件统一显示在正文之后（原文档里图片在段落中间的位置不再保留）。
- 编辑器不支持在正文中插入图片；图片作为附件管理。
- 键盘完整走查、200% 缩放未逐项验证。全局右下角「快捷菜单」浮动按钮会部分遮住所有后台编辑页吸底栏右侧的保存按钮（既有问题，非本次引入）。
