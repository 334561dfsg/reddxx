// Line-icon registry: every hand-drawn 24px stroke icon of the site in one place, grouped into sets.
// A set carries the SVG attributes its icons were designed with (size, stroke, class), so <LineIcon set name>
// renders exactly what the former per-domain icon components drew. `ui` icons take their attributes from the caller.
// Entries are trusted static markup (rendered with v-html); never put user or remote data here.

const stroke = {fill: 'none', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}

export const iconSets = {
 c2c: {attrs: {class: 'c2c-icon', width: 16, height: 16, ...stroke, 'stroke-width': 1.7}, icons: {
  "buy": "<path d=\"M3 3h2l2.4 12h12l2-8H6M9 21h.01M19 21h.01\"/>",
  "sell": "<path d=\"M20 13 13 20 3 10V3h7Z M7 7h.01\"/>",
  "orders": "<path d=\"M6 3h14v18H6z M3 7h3 M3 12h3 M3 17h3 M10 7h6 M10 12h6 M10 17h4\"/>",
  "bank": "<path d=\"m3 9 9-6 9 6H3 M5 10v8 M10 10v8 M14 10v8 M19 10v8 M3 21h18\"/>",
  "store": "<path d=\"M3 10 5 4h14l2 6 M3 10c0 4 6 4 6 0 0 4 6 4 6 0 0 4 6 4 6 0 M5 14v7h14v-7 M9 21v-6h6v6\"/>",
  "timer": "<path d=\"M10 2h4 M12 14l3-3\"/><circle cx=\"12\" cy=\"14\" r=\"8\"/>",
  "exchange": "<path d=\"M4 7h16l-5-5 M20 17H4l5 5\"/>",
 }},
 earn: {attrs: {class: 'earn-icon', width: 16, height: 16, ...stroke, 'stroke-width': 1.7}, icons: {
  "inbox": "<path d=\"M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z\"/>",
  "sprout": "<path d=\"M12 22v-8M12 14C12 7 5 7 3 7c0 6 3 9 9 7ZM12 11c0-6 5-9 9-9 0 6-3 10-9 9Z\"/>",
  "flame": "<path d=\"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/>",
  "lock": "<path d=\"M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Z\"/>",
  "calendar": "<path d=\"M8 2v4M16 2v4M3 10h18M3 4h18v18H3ZM7 14h2M12 14h2M7 18h2M12 18h2\"/>",
  "banknote": "<circle cx=\"12\" cy=\"12\" r=\"2\"/><path d=\"M2 6h20v12H2ZM6 10v4M18 10v4\"/>",
  "receipt": "<path d=\"M5 3h14v19l-3-2-4 2-4-2-3 2ZM8 7h8M8 11h8M8 15h5\"/>",
 }},
 lending: {attrs: {class: 'loan-icon', ...stroke, 'stroke-width': 2}, icons: {
  "sprout": "<path d=\"M7 20h10M10 20c5.5-2.5.8-6.4 3-10M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8zM14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z\"/>",
  "coins": "<circle cx=\"8\" cy=\"8\" r=\"6\"/><path d=\"M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4m8.71 3.88.7.71-2.82 2.82\"/>",
  "banknote": "<rect width=\"20\" height=\"12\" x=\"2\" y=\"6\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/><path d=\"M6 12h.01M18 12h.01\"/>",
  "wallet": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2M3 11h3c.8 0 1.6.3 2.1.9l1.1.9c1.6 1.6 4.1 1.6 5.7 0l1.1-.9c.5-.5 1.3-.9 2.1-.9H21\"/>",
  "arrow-right": "<path d=\"M5 12h14m-7-7 7 7-7 7\"/>",
 }},
 ui: {attrs: {}, icons: {
  "smile": "<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M8.5 14a4 4 0 0 0 7 0M9 9h.01M15 9h.01\"/>",
  "paperclip": "<path d=\"m8 13 6-6a3 3 0 0 1 4 4l-7 7a5 5 0 0 1-7-7l7-7M7 14l7-7\"/>",
  "send": "<path d=\"m21 3-7 18-4-7-7-4 18-7ZM10 14 21 3\"/>",
  "caret-down": {"viewBox": "0 0 16 16", "body": "<path d=\"m4 6 4 4 4-4\"/>"},
  "search": {"viewBox": "0 0 16 16", "body": "<circle cx=\"7\" cy=\"7\" r=\"5\"/><path d=\"m11 11 4 4\"/>"},
  "check": {"viewBox": "0 0 16 16", "body": "<path d=\"m3 8 3 3 7-7\"/>"},
  "inbox": "<path d=\"M22 12h-6l-2 3h-4l-2-3H2\"/><path d=\"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11\"/>",
  "arrow-left": "<path d=\"m12 19-7-7 7-7M19 12H5\"/>",
  "history": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2\"/>",
  "chevron-down": "<path d=\"m6 9 6 6 6-6\"/>",
  "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21a8 8 0 0 1 16 0\"/>",
  "settings": "<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  "id-card": "<rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\"/><circle cx=\"8\" cy=\"11\" r=\"2\"/><path d=\"M5 16a3 3 0 0 1 6 0M14 10h4M14 14h3\"/>",
  "file-text": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8\"/>",
  "user-plus": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M19 8v6M22 11h-6\"/>",
  "bell": "<path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0\"/>",
  "eraser": "<path d=\"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21M22 21H7M5 11l9 9\"/>",
  "help-circle": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01\"/>",
  "key": "<path d=\"m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4M21 2l-9.6 9.6\"/><circle cx=\"7.5\" cy=\"15.5\" r=\"5.5\"/>",
  "mail": "<rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\"/><path d=\"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7\"/>",
  "lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>",
  "monitor": "<rect width=\"20\" height=\"14\" x=\"2\" y=\"3\" rx=\"2\"/><path d=\"M8 21h8M12 17v4\"/>",
  "smartphone": "<rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\"/><path d=\"M12 18h.01\"/>",
  "log-out": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9\"/>",
  "globe": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20\"/>",
  "crown": "<path d=\"M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.29l4.27-3.66a.5.5 0 0 1 .82.5l-2.83 10.25a1 1 0 0 1-.96.75H5.8a1 1 0 0 1-.96-.75L2.02 5.99a.5.5 0 0 1 .82-.5l4.27 3.66a1 1 0 0 0 1.52-.29zM5 21h14\"/>",
  "clipboard": "<rect x=\"8\" y=\"2\" width=\"8\" height=\"4\" rx=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/>",
  "shield-alert": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"M12 8v4M12 16h.01\"/>",
  "swap-vertical": "<path d=\"M8 20V4M4 8l4-4 4 4M16 4v16M12 16l4 4 4-4\"/>",
  "alert-triangle": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01\"/>",
  "copy": "<rect x=\"8\" y=\"8\" width=\"14\" height=\"14\" rx=\"2\"/><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"/>",
  "shield": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zM9 12l2 2 4-4\"/>",
  "image": "<rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><circle cx=\"9\" cy=\"9\" r=\"2\"/><path d=\"m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21\"/>",
  "upload": "<path d=\"M12 3v12M17 8l-5-5-5 5M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/>",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6M12 7h.01\"/>",
  "message-circle": "<path d=\"M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.2A8 8 0 1 1 20 11.5Z\"/>",
  "spinner": "<path d=\"M21 12a9 9 0 1 1-6.219-8.56\"/>",
  "pause": "<rect x=\"14\" y=\"4\" width=\"4\" height=\"16\" rx=\"1\"/><rect x=\"6\" y=\"4\" width=\"4\" height=\"16\" rx=\"1\"/>",
  "play": "<path d=\"M6 3l14 9-14 9V3z\"/>",
  "stop": "<rect x=\"5\" y=\"5\" width=\"14\" height=\"14\" rx=\"2\"/>",
  "chevron-right": "<path d=\"m9 18 6-6-6-6\"/>",
  "eye": "<path d=\"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  "eye-off": "<path d=\"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"m2 2 20 20\"/>",
  "trend-up": "<path d=\"M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6\"/>",
  "trend-down": "<path d=\"M22 17 13.5 8.5 8.5 13.5 2 7M16 17h6v-6\"/>",
 }},
}

/** Resolves a set/name pair to {viewBox, body, attrs}; null for an unknown icon. */
export function lineIcon(set, name) {
 const group = iconSets[set], entry = group?.icons[name]
 if (entry == null) return null
 const {viewBox = '0 0 24 24', body} = typeof entry === 'string' ? {body: entry} : entry
 return {viewBox, body, attrs: group.attrs}
}
