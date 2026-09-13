import { useEffect, useRef } from 'react'

/**
 * Selector for the first *meaningful* field in a form.
 *
 * Hidden inputs and the small icon buttons are skipped so keyboard users land on
 * the first thing they can actually type into.
 */
export const FIRST_FIELD_SELECTOR =
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select, textarea'

/**
 * Scroll the edit form into view (and focus its first field) on the admin manage
 * pages.
 *
 * Pass an "edit key" rather than a plain boolean when you want the behaviour to
 * repeat for every item — e.g. `useScrollToForm(editingQuestion?.documentId)`.
 * Returning to the list (`null`) is ignored on purpose: no scrolling happens when
 * the admin leaves edit mode.
 *
 * Smooth scrolling is requested where supported, but respects the user's
 * `prefers-reduced-motion` setting, and focus uses `preventScroll` so the browser
 * doesn't jump to the input and cancel the animation. Attach the returned ref to
 * the form container (`<div ref={formRef}>`).
 */
export default function useScrollToForm(editKey, { focus = true, block = 'start' } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    if (!editKey) return
    const node = ref.current
    if (!node) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior = prefersReducedMotion ? 'auto' : 'smooth'

    if (typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior, block })
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior })
    }

    if (focus) {
      const field = node.querySelector(FIRST_FIELD_SELECTOR)
      // `preventScroll` keeps the smooth scroll above intact.
      field?.focus?.({ preventScroll: true })
    }
  }, [editKey, focus, block])

  return ref
}
