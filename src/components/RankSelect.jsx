import { useTranslation } from 'react-i18next'
import { RANK_LEVELS } from '../utils/refereeRanks'

export default function RankSelect({ id, label, value, onChange, ladder }) {
  const { t } = useTranslation()

  return (
    <div>
      <label className="block text-sm font-medium mb-1" htmlFor={id} style={{ color: 'var(--text-primary)' }}>
        {label}
      </label>
      <select
        id={id}
        name={id}
        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">{t('ranks.noRank') || 'No rank'}</option>
        {RANK_LEVELS.map(level => (
          <optgroup key={level.key} label={t(level.labelKey)}>
            {ladder
              .filter(r => r.level === level.key)
              .map(r => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}
