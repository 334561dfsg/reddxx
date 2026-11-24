# UI language packs

Each language has the same module files and fixed keys. For example:

```text
locales/
  en-US/
    common.json
    auth.json
    profile.json
    trade.json
    earn.json
    news.json
  zh-TW/...
  fr-FR/...
  de-DE/...
  ja-JP/...
  ko-KR/...
```

The JSON filename is the namespace. `profile.changePassword.title` is read from
`profile.json` → `changePassword.title`. Module-local prototype additions are
under `ui`. Use semantic keys; do not use Chinese source sentences as keys.

```vue
<h1>{{ $t('profile.changePassword.title') }}</h1>
<span>{{ $t('common.durationDays', { count: product.days }) }}</span>
```

In script, import `t` from `../i18n`. Prefer `computed(() => t(...))` for displayed
values that must update on language changes. Keep selections as stable values or
message keys; never persist their translated labels as identifiers. Render API
and user text directly. `t` does not reverse-match source text.

Stateful validation messages can store a key, or `{ key, params }` when values
are needed. Rendering `$t(error)` then updates with the active language without
clearing the error or form. Interpolation uses `{{name}}`; brand defaults are
provided centrally. Never concatenate translated sentence fragments.

English is the fallback for a missing localized message. Unknown keys are shown
as keys for diagnosis; absent parameters remain visible as `{{name}}`. Parameter
values are plain text, not HTML. Keep the native language names in `i18n.js`.
News articles/digests and public legal documents live in `src/content/`, separate
from UI language packs. Legal source-language fallback is retained intentionally.

From the repository root:

```sh
npm run check:locales --prefix newtrend-website
npm test --prefix newtrend-website
```

The checker rejects missing keys, differing interpolation parameters, unknown
literal key references and obsolete `$tr` calls. Add the same key and parameter
names to all six languages when adding a label. Parameter values can differ in
order and presentation for each language.
