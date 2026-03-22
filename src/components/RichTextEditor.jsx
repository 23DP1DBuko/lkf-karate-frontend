import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'

export default function RichTextEditor({ value, onChange, label }) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) return null

  const btn = (action, label, isActive) => (
    <button
      type="button"
      onClick={action}
      className={`px-2 py-1 text-sm rounded font-medium transition ${
        isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div>
      {label && <label className="block text-sm font-medium mb-1">{label}</label>}
      <div className="border rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border-b">
          {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
          {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
          {btn(() => editor.chain().focus().toggleUnderline().run(), 'U', editor.isActive('underline'))}
          {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', editor.isActive('heading', { level: 1 }))}
          {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
          {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
          {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
          {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
          {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}
          {btn(() => editor.chain().focus().clearNodes().unsetAllMarks().run(), '✕ Clear', false)}
        </div>

        {/* Editor */}
        <EditorContent
          editor={editor}
          className="p-3 min-h-48 prose max-w-none focus:outline-none"
        />
      </div>
    </div>
  )
}