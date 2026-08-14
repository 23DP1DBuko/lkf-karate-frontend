import RichTextEditor from './RichTextEditor'
import { 
  PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon,
  PhotoIcon, VideoCameraIcon, DocumentTextIcon, QuestionMarkCircleIcon,
  TableCellsIcon, ListBulletIcon, XMarkIcon
} from '@heroicons/react/24/outline'
import MediaUpload from './MediaUpload'
import { useState, useEffect } from 'react'
import api from '../api/strapi'

const BLOCK_TYPES = [
  { type: 'text', label: 'Text', icon: DocumentTextIcon },
  { type: 'list', label: 'List', icon: ListBulletIcon },
  { type: 'table', label: 'Table', icon: TableCellsIcon },
  { type: 'video', label: 'YouTube Video', icon: VideoCameraIcon },
  { type: 'image', label: 'Image', icon: PhotoIcon },
  { type: 'note', label: 'Note/Callout', icon: DocumentTextIcon },
  { type: 'question', label: 'Question', icon: QuestionMarkCircleIcon },
]

function TableEditor({ block, onChange }) {
  const content = block.content && typeof block.content === 'object'
    ? block.content
    : { headers: [], rows: [], caption: '' }
  const update = (next) => onChange({ ...block, content: next })
  const setCell = (ri, ci, val) => {
    const rows = content.rows.map(r => [...r])
    rows[ri][ci] = val
    update({ ...content, rows })
  }
  const setHeader = (ci, val) => {
    const headers = [...content.headers]
    headers[ci] = val
    update({ ...content, headers })
  }
  const addRow = () => update({ ...content, rows: [...content.rows, content.headers.map(() => '')] })
  const removeRow = (ri) => update({ ...content, rows: content.rows.filter((_, i) => i !== ri) })
  const addCol = () => update({ ...content, headers: [...content.headers, ''], rows: content.rows.map(r => [...r, '']) })
  const removeCol = (ci) => update({
    ...content,
    headers: content.headers.filter((_, i) => i !== ci),
    rows: content.rows.map(r => r.filter((_, i) => i !== ci)),
  })

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
              {content.headers.map((h, ci) => (
                <th key={ci} className="p-1 border-b relative min-w-[90px]" style={{ borderColor: 'var(--border)' }}>
                  <input
                    value={h}
                    placeholder={`Col ${ci + 1}`}
                    onChange={e => setHeader(ci, e.target.value)}
                    className="w-full bg-transparent px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeCol(ci)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                    aria-label="Remove column"
                  >
                    <XMarkIcon className="w-2.5 h-2.5" />
                  </button>
                </th>
              ))}
              <th className="p-1 border-b w-8" style={{ borderColor: 'var(--border)' }}>
                <button type="button" onClick={addCol} className="w-6 h-6 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center text-sm" aria-label="Add column">
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, ri) => (
              <tr key={ri} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                {row.map((cell, ci) => (
                  <td key={ci} className="p-1 border-r last:border-r-0" style={{ borderColor: 'var(--border)' }}>
                    <input
                      value={cell}
                      onChange={e => setCell(ri, ci, e.target.value)}
                      className="w-full bg-transparent px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </td>
                ))}
                <td className="p-1 w-8 align-top">
                  <button type="button" onClick={() => removeRow(ri)} className="w-6 h-6 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 flex items-center justify-center text-xs" aria-label="Remove row">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={addRow} className="text-xs px-3 py-1.5 rounded-lg border font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          + Add row
        </button>
        <input
          value={content.caption || ''}
          onChange={e => update({ ...content, caption: e.target.value })}
          placeholder="Caption (optional)"
          className="flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
      </div>
      {block.needsReview && (
        <p className="text-xs text-amber-600">⚠ needs review (from PDF import) — check the grid</p>
      )}
    </div>
  )
}

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

       {block.type === 'image' && (
          <div>
            <MediaUpload
              label="Upload Image"
              current={block.media || null}
              onUpload={(file) => onChange({ ...block, media: file })}
            />
            <input
              type="text"
              placeholder="Caption (optional)"
              value={block.caption || ''}
              onChange={e => onChange({ ...block, caption: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        )}

        {block.type === 'list' && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              List items (one per line)
            </label>
            <textarea
              rows={Math.max(3, (block.items || []).length + 1)}
              placeholder={'Item one\nItem two\nItem three'}
              value={(block.items || []).join('\n')}
              onChange={e => onChange({ ...block, items: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            {block.needsReview && (
              <p className="text-xs mt-1 text-amber-600">⚠ needs review (from PDF import)</p>
            )}
          </div>
        )}

        {block.type === 'table' && (
          <TableEditor block={block} onChange={onChange} />
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

        {block.type === 'question' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Question text
              </label>
              <textarea
                rows={2}
                placeholder="Enter question..."
                value={block.content || ''}
                onChange={e => onChange({ ...block, content: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Type
              </label>
              <select
                value={block.questionType || 'yes_no'}
                onChange={e => onChange({
                  ...block,
                  questionType: e.target.value,
                  options: [],
                  correctAnswer: '',
                  correctAnswers: [],
                })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="yes_no">Yes / No</option>
                <option value="single_choice">Single Choice</option>
                <option value="multiple_choice">Multiple Choice (multi-select)</option>
                <option value="aka_ao">Aka / Ao (video)</option>
              </select>
            </div>

            {(block.questionType === 'multiple_choice' || block.questionType === 'single_choice') && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Options (one per line)
                </label>
                <textarea
                  rows={4}
                  placeholder="Option A&#10;Option B&#10;Option C&#10;Option D"
                  value={(block.options || []).join('\n')}
                  onChange={e => onChange({ ...block, options: e.target.value.split('\n') })}
                  onBlur={e => onChange({ ...block, options: e.target.value.split('\n').filter(o => o.trim() !== '') })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            )}

            {block.questionType === 'aka_ao' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    AKA video URL (YouTube or direct link) — leave AO empty for a single centered video
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={block.videoAkaUrl || ''}
                    onChange={e => onChange({ ...block, videoAkaUrl: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                  {block.videoAkaUrl && (() => {
                    const vid = getYouTubeId(block.videoAkaUrl)
                    return (
                      <div className="mt-2 rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                        {vid ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${vid}`}
                            className="w-full h-full"
                            allowFullScreen
                            title="AKA video preview"
                          />
                        ) : (
                          <video controls preload="metadata" src={block.videoAkaUrl} className="w-full h-full" />
                        )}
                      </div>
                    )
                  })()}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    AO video URL (optional — adds a second labeled video)
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={block.videoAoUrl || ''}
                    onChange={e => onChange({ ...block, videoAoUrl: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Correct answer
              </label>
              {block.questionType === 'yes_no' && (
                <div className="flex gap-2">
                  {['true', 'false'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onChange({ ...block, correctAnswer: val })}
                      className="flex-1 py-2 rounded-lg border text-sm font-medium transition"
                      style={{
                        backgroundColor: block.correctAnswer === val ? '#2563eb' : 'var(--bg-secondary)',
                        color: block.correctAnswer === val ? 'white' : 'var(--text-primary)',
                        borderColor: block.correctAnswer === val ? '#2563eb' : 'var(--border)',
                      }}
                    >
                      {val === 'true' ? '✓ Yes' : '✗ No'}
                    </button>
                  ))}
                </div>
              )}
              {block.questionType === 'aka_ao' && (
                <div className="flex gap-2">
                  {['aka', 'ao'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onChange({ ...block, correctAnswer: val })}
                      className="flex-1 py-2 rounded-lg border text-sm font-bold uppercase transition"
                      style={{
                        backgroundColor: block.correctAnswer === val ? (val === 'aka' ? '#dc2626' : '#2563eb') : 'var(--bg-secondary)',
                        color: block.correctAnswer === val ? 'white' : 'var(--text-primary)',
                        borderColor: block.correctAnswer === val ? (val === 'aka' ? '#dc2626' : '#2563eb') : 'var(--border)',
                      }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              )}
              {block.questionType === 'single_choice' && (
                <select
                  value={block.correctAnswer || ''}
                  onChange={e => onChange({ ...block, correctAnswer: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select correct answer</option>
                  {(block.options || []).filter(o => o.trim()).map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              {block.questionType === 'multiple_choice' && (
                <div className="space-y-1.5">
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Select all correct options
                  </p>
                  {(block.options || []).filter(o => o.trim()).map((opt, i) => {
                    const on = (block.correctAnswers || []).includes(opt)
                    return (
                      <label
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer"
                        style={{
                          borderColor: on ? '#2563eb' : 'var(--border)',
                          backgroundColor: on ? 'rgba(37,99,235,0.08)' : 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => {
                            const list = block.correctAnswers || []
                            onChange({
                              ...block,
                              correctAnswers: e.target.checked
                                ? [...list, opt]
                                : list.filter(v => v !== opt),
                            })
                          }}
                          className="accent-blue-600"
                        />
                        {opt}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        {block.type === 'bank_question' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                From question bank
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                id: {block.questionId?.slice(0, 8)}...
              </span>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {block.content}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Correct:{' '}
              <span className="text-green-600 font-medium">
                {Array.isArray(block.correctAnswers) && block.correctAnswers.length > 0
                  ? block.correctAnswers.join(', ')
                  : block.correctAnswer || '—'}
              </span>
            </p>
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

function BankPicker({ courseId, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      let page = 1
      let all = []
      while (true) {
        const res = await api.get('/questions', {
          params: {
            'filters[course][documentId][$eq]': courseId,
            'pagination[page]': page,
            'pagination[pageSize]': 100,
            'sort': 'order:asc',
          },
        })
        const items = res.data.data || []
        all = [...all, ...items]
        if (page >= res.data.meta.pagination.pageCount) break
        page++
      }
      if (!cancelled) { setQuestions(all); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [courseId])

  const filtered = questions.filter(q =>
    (q.text || q.textLv || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="rounded-xl border shadow-lg overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Question Bank ({questions.length})
        </p>
        <button type="button" onClick={onClose}
          className="text-xs" style={{ color: 'var(--text-muted)' }}>✕ Close</button>
      </div>

      <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <input
          type="text"
          placeholder="Search questions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
      </div>

      <div className="max-h-64 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
        {loading && (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No questions found</p>
        )}
        {filtered.map(q => (
          <button
            key={q.id}
            type="button"
            onClick={() => onSelect(q)}
            className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
            style={{ color: 'var(--text-primary)' }}
          >
            <span className="text-xs font-mono mr-2" style={{ color: 'var(--text-muted)' }}>
              #{q.order}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${
              q.type === 'yes_no' ? 'bg-purple-100 text-purple-700'
              : q.type === 'single_choice' ? 'bg-teal-100 text-teal-700'
              : q.type === 'aka_ao' ? 'bg-amber-100 text-amber-700'
              : 'bg-blue-100 text-blue-700'
            }`}>
              {q.type === 'yes_no' ? 'Y/N'
                : q.type === 'single_choice' ? 'SC'
                : q.type === 'aka_ao' ? 'A/A'
                : 'MC'}
            </span>
            {q.text || q.textLv || ''}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function BlockEditor({ blocks = [], onChange, courseId }) {
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showBankPicker, setShowBankPicker] = useState(false)

  const addBlock = (type) => {
    const newBlock = {
      id: crypto.randomUUID(),
      type,
      content: type === 'table' ? { headers: ['Column'], rows: [['']], caption: '' } : '',
      mediaItems: [],
      embedUrl: '',
      caption: '',
      questionType: 'yes_no',
      options: [],
      correctAnswer: '',
      correctAnswers: [],
      videoAkaUrl: '',
      videoAoUrl: '',
    }
    if (type === 'list') newBlock.items = ['Item']
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

      {/* Add block buttons */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowAddMenu(!showAddMenu)
              setShowBankPicker(false)
            }}
            className="w-full border-2 border-dashed rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition hover:border-blue-400 hover:text-blue-600"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
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
                  type="button"
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

        {courseId && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              setShowBankPicker(!showBankPicker)
              setShowAddMenu(false)
            }}
            className="border-2 border-dashed rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 transition hover:border-purple-400 hover:text-purple-600 whitespace-nowrap"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            <QuestionMarkCircleIcon className="w-4 h-4" />
            From question bank
          </button>
        )}
      </div>

      {/* Question bank picker */}
      {showBankPicker && courseId && (
        <BankPicker
          courseId={courseId}
          onSelect={(question) => {
            const newBlock = {
              id: Date.now().toString(),
              type: 'bank_question',
              questionId: question.documentId,
              content: question.text || question.textLv || '',
              questionType: question.type,
              options: question.optionsLv || question.options || [],
              correctAnswer: question.correctAnswer,
              correctAnswers: question.correctAnswers || [],
              videoAkaUrl: question.videoAkaUrl || '',
              videoAoUrl: question.videoAoUrl || '',
              mediaItems: [],
              embedUrl: '',
              caption: '',
            }
            onChange([...blocks, newBlock])
            setShowBankPicker(false)
          }}
          onClose={() => setShowBankPicker(false)}
        />
      )}
    </div>
  )
}