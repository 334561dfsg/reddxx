// Account modes (review 2026-11-27): the session stores the mode as its label key, so the value doubles as the
// 真實 / 模擬 label. Compare through these helpers only — never against the literal strings.
export const MODE_REAL = 'common.demo.real'
export const MODE_DEMO = 'common.demo.demo'
export const MODES = [MODE_REAL, MODE_DEMO]
/** True for the demo account; also accepts the short store keys 'demo' / 'real'. */
export const isDemo = mode => mode === MODE_DEMO || mode === 'demo'
/** Short per-mode store key ('real' | 'demo') for a session mode or a short key. */
export const modeKey = mode => (isDemo(mode) ? 'demo' : 'real')
