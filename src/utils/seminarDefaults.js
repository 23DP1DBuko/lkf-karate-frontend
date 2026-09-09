// ─────────────────────────────────────────────────────────────────────────────
// Configurable seminar defaults.
//
// The president always signs certificates; the exact person may change over
// time, so the default lives here (one place) instead of being hardcoded in
// components. The stored seminar record wins — these are only fallbacks.
// ─────────────────────────────────────────────────────────────────────────────
export const SEMINAR_DEFAULTS = {
  presidentSignerName: 'Santa Drozdova',
  presidentSignerTitle: 'LKF President',
  // Suggested title when the admin switches the "Online seminar" toggle on.
  // It is only a suggestion — a manually typed title is never overwritten.
  onlineTitle: 'Online Zoom seminārs',
}

