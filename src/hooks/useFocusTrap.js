import { useEffect } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'iframe',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Traps keyboard focus inside a modal container (WCAG 2.2 — focus trapping).
 *
 * - Moves focus into the dialog when it opens (unless an element opts into
 *   autoFocus, which takes precedence).
 * - Cycles Tab / Shift+Tab between the first and last focusable elements.
 * - Restores focus to the previously focused element when the dialog closes.
 *
 * @param {import('react').MutableRefObject<HTMLElement|null>} ref ref of the modal container
 */
export default function useFocusTrap(ref) {
  useEffect(() => {
    const container = ref.current
    if (!container) return

    const previouslyFocused = document.activeElement

    const getFocusable = () =>
      Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        el => el.offsetParent !== null || el === document.activeElement
      )

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return
      const focusable = getFocusable()
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (!container.contains(document.activeElement)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    // Move focus into the dialog on open (respect explicit autoFocus fields)
    if (!container.querySelector('[autofocus]')) {
      const focusable = getFocusable()
      ;(focusable[0] || container).focus?.()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the element that opened the dialog
      previouslyFocused?.focus?.()
    }
  }, [ref])
}
