/**
 * Convert a YouTube watch/shorts/youtu.be URL into an embed URL, or null when
 * the value is not a YouTube link (e.g. a local Strapi upload path).
 * Shared by YouTubeEmbed, AkaAoQuestion and the admin VideoSlot.
 */
export function getYouTubeEmbedUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed${u.pathname}`
    const v = u.searchParams.get('v')
    return v ? `https://www.youtube.com/embed/${v}` : null
  } catch {
    return null
  }
}