import { mediaUrl } from '../api/media'

export default function QuestionMedia({ media }) {
  if (!media) return null
  const items = Array.isArray(media) ? media : [media]
  if (items.length === 0) return null
  return (
    <div className="mb-4 space-y-2">
      {items.map((item, i) => {
        if (item.mime?.startsWith('image/')) return (
          <img key={i} src={mediaUrl(item.url)} alt={item.alternativeText || 'Question media'}
            className="w-full rounded-lg max-h-64 object-cover" />
        )
        if (item.mime?.startsWith('video/')) return (
          <video key={i} controls className="w-full rounded-lg max-h-64">
            <source src={mediaUrl(item.url)} type={item.mime} />
          </video>
        )
        return null
      })}
    </div>
  )
}