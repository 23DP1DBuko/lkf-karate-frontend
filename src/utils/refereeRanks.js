// Official referee & judge license ladders (WKF / EKF / national federation).
// A user holds ONE rank per discipline: `rankKumite` and `rankKata`.
// Referee (center-mat) roles exist only on the kumite path — kata competitions
// are judged with flags only, which is why the kata ladder has no referee tiers.

export const RANK_LEVELS = [
  { key: 'national', labelKey: 'ranks.levelNational' },
  { key: 'ekf', labelKey: 'ranks.levelEKF' },
  { key: 'wkf', labelKey: 'ranks.levelWKF' },
]

export const KUMITE_RANKS = [
  // National level
  { value: 'national-judge-c', label: 'National Judge C', level: 'national' },
  { value: 'national-judge-b', label: 'National Judge B', level: 'national' },
  { value: 'national-judge-a', label: 'National Judge A', level: 'national' },
  { value: 'national-referee-b', label: 'National Referee B', level: 'national' },
  { value: 'national-referee-a', label: 'National Referee A', level: 'national' },
  // Continental (EKF)
  { value: 'ekf-kumite-judge-b', label: 'EKF Kumite Judge B', level: 'ekf' },
  { value: 'ekf-kumite-judge-a', label: 'EKF Kumite Judge A', level: 'ekf' },
  { value: 'ekf-kumite-referee-b', label: 'EKF Kumite Referee B', level: 'ekf' },
  { value: 'ekf-kumite-referee-a', label: 'EKF Kumite Referee A', level: 'ekf' },
  // World (WKF)
  { value: 'wkf-judge-b', label: 'WKF Judge B', level: 'wkf' },
  { value: 'wkf-judge-a', label: 'WKF Judge A', level: 'wkf' },
  { value: 'wkf-referee-b', label: 'WKF Referee B', level: 'wkf' },
  { value: 'wkf-referee-a', label: 'WKF Referee A', level: 'wkf' },
]

export const KATA_RANKS = [
  // National level
  { value: 'national-judge-c', label: 'National Judge C', level: 'national' },
  { value: 'national-judge-b', label: 'National Judge B', level: 'national' },
  { value: 'national-judge-a', label: 'National Judge A', level: 'national' },
  // Continental (EKF)
  { value: 'ekf-kata-judge-b', label: 'EKF Kata Judge B', level: 'ekf' },
  { value: 'ekf-kata-judge-a', label: 'EKF Kata Judge A', level: 'ekf' },
  // World (WKF)
  { value: 'wkf-judge-b', label: 'WKF Judge B', level: 'wkf' },
  { value: 'wkf-judge-a', label: 'WKF Judge A', level: 'wkf' },
]

export function findRankLabel(value, ladder) {
  if (!value) return ''
  return ladder.find(r => r.value === value)?.label || value
}
