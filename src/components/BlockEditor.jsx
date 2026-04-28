import { useState } from 'react'
import RichTextEditor from './RichTextEditor'
import { 
  PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon,
  PhotoIcon, VideoCameraIcon, DocumentTextIcon, QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'

const BLOCK_TYPES = [
  { type: 'text', label: 'Text', icon: DocumentTextIcon, color: 'blue' },
  { type: 'video', label: 'YouTube Video', icon: VideoCameraIcon, color: 'red' },
  { type: 'image_url', label: 'Image URL', icon: PhotoIcon, color: 'green' },
  { type: 'note', label: 'Note/Callout', icon: DocumentTextIcon, color: 'yellow' },
]

function Block({ block, index, total, onChange, onDelete, onMoveUp, onMoveDown }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      {/* Block header */}
      <div className="flex items-center justify-between px-3 py-2 border-b"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {BLOCK_TYPES.find(t => t.type === block.type)?.label || block.type}
        </span>
        <div className="flex gap-1">
          <button onClick={onMoveUp} disabled={index === 0}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
            aria-label="Move up">
            <ArrowUpIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
            aria-label="Move down">
            <ArrowDownIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          </button>
          <button onClick={onDelete}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
            aria-label="Delete block">
            <TrashIcon className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>

      {/* Block content */}
      <div className="p-3" style={{ backgroundColor: 'var(--bg-card)' }}>
        {block.type === 'text' && (
        <RichTextEditor
            key={block.id}
            content={block.content || ''}
            onChange={val => onChange({ ...block, content: val })}
        />
        )}

        {block.type === 'video' && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              YouTube URL
            </label>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={block.url || ''}
              onChange={e => onChange({ ...block, url: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            {block.url && (
              <div className="mt-2 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(block.url)}`}
                  className="w-full h-full"
                  allowFullScreen
                  title="Video preview"
                />
              </div>
            )}
          </div>
        )}

        {block.type === 'image_url' && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Image URL
            </label>
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={block.url || ''}
              onChange={e => onChange({ ...block, url: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            <input
              type="text"
              placeholder="Caption (optional)"
              value={block.caption || ''}
              onChange={e => onChange({ ...block, caption: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            {block.url && (
              <img src={block.url} alt={block.caption || ''} className="mt-2 rounded-lg max-h-48 object-cover w-full" />
            )}
          </div>
        )}

        {block.type === 'note' && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Note text
            </label>
            <textarea
              rows={3}
              placeholder="Important note or callout..."
              value={block.content || ''}
              onChange={e => onChange({ ...block, content: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function getYouTubeId(url) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    return u.searchParams.get('v') || ''
  } catch { return '' }
}

export default function BlockEditor({ blocks = [], onChange }) {
  const [showAddMenu, setShowAddMenu] = useState(false)

  const addBlock = (type) => {
    const newBlock = {
      id: Date.now().toString(),
      type,
      content: '',
      url: '',
      caption: '',
    }
    onChange([...blocks, newBlock])
    setShowAddMenu(false)
  }

  const updateBlock = (index, updated) => {
    const next = [...blocks]
    next[index] = updated
    onChange(next)
  }

  const deleteBlock = (index) => {
    onChange(blocks.filter((_, i) => i !== index))
  }

  const moveBlock = (index, dir) => {
    const next = [...blocks]
    const swap = index + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <Block
          key={block.id}
          block={block}
          index={i}
          total={blocks.length}
          onChange={(updated) => updateBlock(i, updated)}
          onDelete={() => deleteBlock(i)}
          onMoveUp={() => moveBlock(i, -1)}
          onMoveDown={() => moveBlock(i, 1)}
        />
      ))}

      {/* Add block button */}
      <div className="relative">
        <button
        onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowAddMenu(!showAddMenu)
        }}
        className="w-full border-2 border-dashed rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition hover:border-blue-400 hover:text-blue-600"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        type="button"  // ← ADD THIS
        >
        <PlusIcon className="w-4 h-4" />
        Add Block
        </button>

        {showAddMenu && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg z-10 overflow-hidden border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            {BLOCK_TYPES.map(bt => (
              <button
                key={bt.type}
                onClick={() => addBlock(bt.type)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-left"
                style={{ color: 'var(--text-primary)' }}
              >
                <bt.icon className="w-4 h-4 text-blue-500" />
                {bt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}