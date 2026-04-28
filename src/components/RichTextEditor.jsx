import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline' 
import { useEffect, useMemo } from 'react'

export default function RichTextEditor({ content, onChange, label }) {
  // 1. Оборачиваем расширения в useMemo, чтобы избежать дублирования при ререндерах
  const extensions = useMemo(() => [
    StarterKit.configure({ history: false }),
    // Расширяем Underline и даем ему уникальное имя, если стандартное занято
    Underline.extend({
      name: 'customUnderline', 
    }).configure(),
  ], [])


  const editor = useEditor({
    extensions,
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // 2. Синхронизация контента (исправлено, чтобы не было прыжков курсора)
  useEffect(() => {
    if (!editor) return
    
    const currentHTML = editor.getHTML()
    if (content !== currentHTML && content !== undefined) {
      // false вторым аргументом предотвращает добавление в историю изменений
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

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
    <div className="w-full">
      {label && <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>}
      <div className="border rounded-lg overflow-hidden border-gray-300">
        {/* Панель инструментов */}
        <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50 border-gray-300">
          {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
          {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
          {btn(() => editor.chain().focus().toggleUnderline().run(), 'U', editor.isActive('underline'))}
          
          <div className="w-px h-6 bg-gray-300 mx-1" /> {/* Разделитель */}
          
          {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 'H1', editor.isActive('heading', { level: 1 }))}
          {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
          {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
          
          <div className="w-px h-6 bg-gray-300 mx-1" />
          
          {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
          {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
          {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}
          
          <div className="ml-auto">
            {btn(() => editor.chain().focus().clearNodes().unsetAllMarks().run(), '✕ Clear', false)}
          </div>
        </div>

        {/* Область редактирования */}
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-3 min-h-[200px] focus:outline-none bg-white text-gray-900"
        />
      </div>
      
      {/* Стили для того, чтобы список и заголовки выглядели корректно внутри Tiptap */}
      <style jsx global>{`
        .ProseMirror {
          min-height: 150px;
          outline: none !important;
        }
        .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; }
        .ProseMirror blockquote { border-left: 3px solid #ccc; padding-left: 1rem; font-style: italic; }
      `}</style>
    </div>
  )
}