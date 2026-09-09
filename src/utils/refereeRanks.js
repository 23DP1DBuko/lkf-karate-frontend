// Official referee & judge license ladders (WKF / EKF / national federation).
// A user holds ONE rank per discipline: `rankKumite` and `rankKata`.
// Referee (center-mat) roles exist only on the kumite path — kata competitions
// are judged with flags only, which is why the kata ladder has no referee tiers.
//
// Each rank carries a `labelKey` (i18n) and a `label` (English fallback used
// when no translation is available). Render with `t(rank.labelKey, rank.label)`.

export const RANK_LEVELS = [
  { key: 'national', labelKey: 'ranks.levelNational' },
  { key: 'ekf', labelKey: 'ranks.levelEKF' },
  { key: 'wkf', labelKey: 'ranks.levelWKF' },
]

export const KUMITE_RANKS = [
  // National level
  { value: 'national-judge-c', label: 'National Judge C', labelKey: 'ranks.labels.national-judge-c', level: 'national' },
  { value: 'national-judge-b', label: 'National Judge B', labelKey: 'ranks.labels.national-judge-b', level: 'national' },
  { value: 'national-judge-a', label: 'National Judge A', labelKey: 'ranks.labels.national-judge-a', level: 'national' },
  { value: 'national-referee-b', label: 'National Referee B', labelKey: 'ranks.labels.national-referee-b', level: 'national' },
  { value: 'national-referee-a', label: 'National Referee A', labelKey: 'ranks.labels.national-referee-a', level: 'national' },
  // Continental (EKF)
  { value: 'ekf-kumite-judge-b', label: 'EKF Kumite Judge B', labelKey: 'ranks.labels.ekf-kumite-judge-b', level: 'ekf' },
  { value: 'ekf-kumite-judge-a', label: 'EKF Kumite Judge A', labelKey: 'ranks.labels.ekf-kumite-judge-a', level: 'ekf' },
  { value: 'ekf-kumite-referee-b', label: 'EKF Kumite Referee B', labelKey: 'ranks.labels.ekf-kumite-referee-b', level: 'ekf' },
  { value: 'ekf-kumite-referee-a', label: 'EKF Kumite Referee A', labelKey: 'ranks.labels.ekf-kumite-referee-a', level: 'ekf' },
  // World (WKF)
  { value: 'wkf-judge-b', label: 'WKF Judge B', labelKey: 'ranks.labels.wkf-judge-b', level: 'wkf' },
  { value: 'wkf-judge-a', label: 'WKF Judge A', labelKey: 'ranks.labels.wkf-judge-a', level: 'wkf' },
  { value: 'wkf-referee-b', label: 'WKF Referee B', labelKey: 'ranks.labels.wkf-referee-b', level: 'wkf' },
  { value: 'wkf-referee-a', label: 'WKF Referee A', labelKey: 'ranks.labels.wkf-referee-a', level: 'wkf' },
]

export const KATA_RANKS = [
  // National level
  { value: 'national-judge-c', label: 'National Judge C', labelKey: 'ranks.labels.national-judge-c', level: 'national' },
  { value: 'national-judge-b', label: 'National Judge B', labelKey: 'ranks.labels.national-judge-b', level: 'national' },
  { value: 'national-judge-a', label: 'National Judge A', labelKey: 'ranks.labels.national-judge-a', level: 'national' },
  // Continental (EKF)
  { value: 'ekf-kata-judge-b', label: 'EKF Kata Judge B', labelKey: 'ranks.labels.ekf-kata-judge-b', level: 'ekf' },
  { value: 'ekf-kata-judge-a', label: 'EKF Kata Judge A', labelKey: 'ranks.labels.ekf-kata-judge-a', level: 'ekf' },
  // World (WKF)
  { value: 'wkf-judge-b', label: 'WKF Judge B', labelKey: 'ranks.labels.wkf-judge-b', level: 'wkf' },
  { value: 'wkf-judge-a', label: 'WKF Judge A', labelKey: 'ranks.labels.wkf-judge-a', level: 'wkf' },
]

export function findRankLabel(value, ladder, t) {
  if (!value) return ''
  const rank = ladder.find(r => r.value === value)
  if (!rank) return value
  return t ? t(rank.labelKey, rank.label) : rank.label
}
