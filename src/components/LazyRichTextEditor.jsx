// LazyRichTextEditor.jsx — Dynamically imports @tiptap/react (365 kB) only when a text block is being edited
//
// This keeps tiptap out of the main bundle for student/landing/login pages
// where the rich text editor is never shown.

import { lazy, Suspense } from 'react'

const RichTextEditor = lazy(() => import('./RichTextEditor'))

function EditorFallback() {
  return (
    <div className="border rounded-lg p-4 animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="h-8 w-24 rounded mb-3" style={{ backgroundColor: 'var(--border)' }} />
      <div className="h-32 rounded" style={{ backgroundColor: 'var(--border)' }} />
    </div>
  )
}

export default function LazyRichTextEditor(props) {
  return (
    <Suspense fallback={<EditorFallback />}>
      <RichTextEditor {...props} />
    </Suspense>
  )
}
