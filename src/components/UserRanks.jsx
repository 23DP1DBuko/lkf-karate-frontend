import { useTranslation } from 'react-i18next'
import { KUMITE_RANKS, KATA_RANKS, findRankLabel } from '../utils/refereeRanks'

export default function UserRanks({ user }) {
  const { t } = useTranslation()
  const hasRanks = user?.rankKumite || user?.rankKata

  if (!hasRanks) return <span>—</span>

  return (
    <div className="space-y-0.5">
      {user.rankKumite && (
        <p>
          <span className="font-medium">{t('ranks.kumiteShort')}:</span>{' '}
          {findRankLabel(user.rankKumite, KUMITE_RANKS)}
        </p>
      )}
      {user.rankKata && (
        <p>
          <span className="font-medium">{t('ranks.kataShort')}:</span>{' '}
          {findRankLabel(user.rankKata, KATA_RANKS)}
        </p>
      )}
    </div>
  )
}
