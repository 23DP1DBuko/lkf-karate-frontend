import {
  ArrowUpIcon, ArrowDownIcon, TrashIcon,
  DocumentTextIcon, ListBulletIcon, TableCellsIcon, PhotoIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { htmlToPlainText, plainTextToHtml } from '../utils/chapterImportBlocks'

// One editable block inside the /admin/chapters/import preview.
//
// The PDF parser only produces text / list / table / image blocks, so those are
// the four the judge can correct here before the chapter is saved. The stored
// shape matches BlockEditor exactly, so a re-opened chapter keeps rendering the
// same way once it has been imported.

const BLOCK_META = {
  text: { label: 'Text', icon: DocumentTextIcon, cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
  list: { label: 'List', icon: ListBulletIcon, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  table: { label: 'Table', icon: TableCellsIcon, cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  image: { label: 'Image', icon: PhotoIcon, cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
}

const inputStyle = {
  backgroundColor: 'var(--input-bg)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
}

const inputClass =
  'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function TableGrid({ content, onChange }) {
  const headers = content.headers || []
  const rows = content.rows || []

  const setCell = (rowIndex, colIndex, value) => {
    const nextRows = rows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? value : cell)) : row,
    )
    onChange({ ...content, rows: nextRows })
  }

  const setHeader = (colIndex, value) => {
    onChange({
      ...content,
      headers: headers.map((header, ci) => (ci === colIndex ? value : header)),
    })
  }

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {headers.map((header, ci) => (
              <th key={ci} className="p-1 border-b" style={{ borderColor: 'var(--border)' }}>
                <input
                  value={header}
                  onChange={(e) => setHeader(ci, e.target.value)}
                  className="w-full min-w-[90px] bg-transparent px-2 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                  style={{ color: 'var(--text-primary)' }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              {row.map((cell, ci) => (
                <td key={ci} className="p-1" style={{ borderColor: 'var(--border)' }}>
                  <input
                    value={cell}
                    onChange={(e) => setCell(ri, ci, e.target.value)}
                    className="w-full min-w-[90px] bg-transparent px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                    style={{ color: 'var(--text-secondary)' }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ChapterImportBlockEditor({
  block,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  labels = {},
}) {
  const meta = BLOCK_META[block.type] || BLOCK_META.text
  const Icon = meta.icon
  const set = (next) => onChange({ ...block, ...next })

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <div
        className="flex items-center gap-2 px-3 py-1.5 border-b"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>#{index + 1}</span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.cls}`}>
          <Icon className="w-3 h-3" />
          {meta.label}
        </span>
        {block.needsReview && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600">
            <ExclamationTriangleIcon className="w-3 h-3" />
            {labels.needsReview || 'Needs review'}
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
          aria-label={labels.moveUp || 'Move block up'}
        >
          <ArrowUpIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
          aria-label={labels.moveDown || 'Move block down'}
        >
          <ArrowDownIcon className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
          aria-label={labels.removeBlock || 'Remove block'}
        >
          <TrashIcon className="w-3.5 h-3.5 text-red-500" />
        </button>
      </div>

      <div className="p-3 space-y-2" style={{ backgroundColor: 'var(--bg-card)' }}>
        {block.type === 'text' && (
          <textarea
            rows={3}
            value={htmlToPlainText(block.content)}
            onChange={(e) => set({ content: plainTextToHtml(e.target.value) })}
            placeholder={labels.textPlaceholder || 'Paragraph text…'}
            className={`${inputClass} resize-y`}
            style={inputStyle}
          />
        )}

        {block.type === 'list' && (
          <textarea
            rows={Math.max(3, (block.items || []).length + 1)}
            value={(block.items || []).join('\n')}
            onChange={(e) => set({ items: e.target.value.split('\n') })}
            onBlur={(e) => set({ items: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
            placeholder={labels.listPlaceholder || 'One item per line'}
            className={`${inputClass} resize-y`}
            style={inputStyle}
          />
        )}

        {block.type === 'table' && (
          <>
            <TableGrid
              content={block.content && typeof block.content === 'object'
                ? block.content
                : { headers: [], rows: [] }}
              onChange={(content) => set({ content })}
            />
            <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {labels.tableCaption || 'Table caption'}
            </label>
            <input
              value={block.content?.caption || ''}
              onChange={(e) => set({ content: { ...block.content, caption: e.target.value } })}
              placeholder={labels.tableCaptionPlaceholder || 'e.g. Table 1 — Number of judges'}
              className={inputClass}
              style={inputStyle}
            />
            <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {labels.tableText || 'Plain-text version (shown if the table cannot be laid out)'}
            </label>
            <textarea
              rows={Math.min(8, Math.max(3, (block.content?.text || '').split('\n').length))}
              value={block.content?.text || ''}
              onChange={(e) => set({ content: { ...block.content, text: e.target.value } })}
              className={`${inputClass} font-mono text-xs resize-y`}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => set({
                content: {
                  ...block.content,
                  text: (block.content?.rows || []).map((row) => row.join(' | ')).join('\n'),
                },
              })}
              className="text-xs px-2.5 py-1 rounded-lg border font-medium transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              {labels.regenerateTableText || 'Rebuild plain text from the table'}
            </button>
          </>
        )}

        {block.type === 'image' && (
          <>
            <div
              className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-secondary)' }}
            >
              <PhotoIcon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {block._figure?.blob
                  ? (labels.imageCaptured || 'Figure captured from the PDF and will be uploaded on import.')
                  : (labels.imageMissing || 'No figure image detected here — describe it for the judges and students.')}
              </span>
            </div>
            <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {labels.imageDescription || 'Image description'}
            </label>
            <input
              value={block.caption || ''}
              onChange={(e) => set({ caption: e.target.value })}
              placeholder={labels.imageDescriptionPlaceholder || 'Describe what the figure shows'}
              className={inputClass}
              style={inputStyle}
            />
          </>
        )}
      </div>
    </div>
  )
}
