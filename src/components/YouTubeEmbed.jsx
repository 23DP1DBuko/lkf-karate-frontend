import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlayIcon } from '@heroicons/react/24/solid'
import { getYouTubeEmbedUrl } from '../utils/youtube'

/**
 * YouTube embed with click-to-load consent: the iframe (and therefore any
 * request to YouTube, its cookies and tracking) only loads after the user
 * explicitly clicks the play button. Meets the GDPR-style requirement that
 * third-party embeds must not run without consent.
 *
 * Props:
 *   url       — YouTube URL (watch/shorts/youtu.be); non-YouTube values render nothing
 *   title     — iframe title for screen readers
 *   className — extra classes for the 16:9 container
 */
export default function YouTubeEmbed({ url, title = 'YouTube video', className = '' }) {
  const { t } = useTranslation()
  const [consented, setConsented] = useState(false)
  const src = getYouTubeEmbedUrl(url)

  if (!src) return null

  if (!consented) {
    return (
      <div className={`relative w-full aspect-video bg-black/90 ${className}`}>
        <button
          type="button"
          onClick={() => setConsented(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label={t('common.loadVideo') || 'Play video'}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15
            transition-transform hover:scale-105 active:scale-95">
            <PlayIcon className="h-7 w-7 text-white" />
          </span>
          <span className="text-sm font-semibold">{t('common.loadVideo') || 'Play video'}</span>
          <span className="max-w-xs px-4 text-center text-[11px] leading-snug opacity-75">
            {t('common.youtubeConsentNote') || 'Loading the video will send data to YouTube.'}
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className={`w-full aspect-video overflow-hidden bg-black ${className}`}>
      <iframe
        className="w-full h-full"
        src={src}
        title={title}
        allowFullScreen
        loading="lazy"
      />
    </div>
  )
}