import { mediaUrl } from '../api/media'
import YouTubeEmbed from './YouTubeEmbed'

export default function MediaDisplay({ items = [] }) {
  if (!items || !Array.isArray(items) || items.length === 0) return null

  return (
    <div className="mb-4 space-y-3">
      {items.map((item, i) => {
        if (item.type === 'image') {
          const src = item.file?.url || item.url
            if (!src) return null
          return (
            <figure key={i}>
              <img
                src={mediaUrl(src)}
                alt={item.alt || item.caption || 'Attached image'}
                className="w-full rounded-lg max-h-96 object-contain bg-black/5"
              />
              {item.caption && <figcaption className="mt-1 text-xs text-gray-500">{item.caption}</figcaption>}
            </figure>
          )
        }

        if (item.type === 'video') {
          const src = item.file?.url || item.url
          if (!src) return null
          return (
            <figure key={i}>
              <video controls className="w-full rounded-lg max-h-96 bg-black">
                <source src={mediaUrl(src)} type={item.file?.mime || 'video/mp4'} />
              </video>
              {item.caption && <figcaption className="mt-1 text-xs text-gray-500">{item.caption}</figcaption>}
            </figure>
          )
        }

        if (item.type === 'youtube') {
          // Consent-gated embed — YouTube only loads after the user clicks play.
          return (
            <div key={i} className="w-full overflow-hidden rounded-lg">
              <YouTubeEmbed url={item.url} title={item.caption || 'YouTube video'} />
            </div>
          )
        }

        return null
      })}
    </div>
  )
}