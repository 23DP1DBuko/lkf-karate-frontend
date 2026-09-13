import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import YouTubeEmbed from '../components/YouTubeEmbed'

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual('react-i18next')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key) => key,
      i18n: { language: 'en', changeLanguage: () => Promise.resolve() },
    }),
  }
})

describe('YouTubeEmbed — click-to-load consent', () => {
  it('renders a placeholder with NO iframe before consent', () => {
    render(<YouTubeEmbed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />)
    // No network-touching iframe is present until the user opts in.
    expect(screen.queryByTitle('YouTube video')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'common.loadVideo' })).toBeInTheDocument()
  })

  it('loads the iframe only after the user clicks play', async () => {
    const user = userEvent.setup()
    render(<YouTubeEmbed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />)
    await user.click(screen.getByRole('button', { name: 'common.loadVideo' }))
    const iframe = screen.getByTitle('YouTube video')
    expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ')
    expect(iframe).toHaveAttribute('loading', 'lazy')
  })

  it('supports youtu.be short links', async () => {
    const user = userEvent.setup()
    render(<YouTubeEmbed url="https://youtu.be/dQw4w9WgXcQ" />)
    await user.click(screen.getByRole('button', { name: 'common.loadVideo' }))
    expect(screen.getByTitle('YouTube video')).toHaveAttribute(
      'src',
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    )
  })

  it('renders nothing for non-YouTube URLs (local uploads handled by callers)', () => {
    const { container } = render(<YouTubeEmbed url="/uploads/local-video.mp4" />)
    expect(container).toBeEmptyDOMElement()
  })
})