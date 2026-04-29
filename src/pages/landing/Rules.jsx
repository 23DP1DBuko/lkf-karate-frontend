import { useState } from 'react'
import { Link } from 'react-router-dom'

const RULES_PDFS = [
  {
    label: 'Kata Competition Rules 2026',
    url: 'https://www.wkf.net/files/pdf/documents/WKF%20Kata%20Competition%20Rules%202026%20MASTER%20COPY_V2.pdf',
    lang: 'EN',
  },
  {
    label: 'Kumite Competition Rules 2026',
    url: 'https://www.wkf.net/files/pdf/documents/WKF%202026%20Kumite%20Competition%20Rules%20MASTER%20COPY_V11.pdf',
    lang: 'EN',
  },
]

export default function Rules() {
  const [selected, setSelected] = useState(RULES_PDFS[0])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10"
        style={{ backgroundColor: 'var(--nav-bg)', borderColor: 'var(--nav-border)' }}>
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl">🥋</span>
          <span className="font-bold text-blue-700">LKF Karate</span>
        </Link>
        <Link to="/login" className="text-sm text-blue-600 hover:underline">
          Sign In →
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-blue-700 mb-1">WKF Competition Rules</h1>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Official WKF rules documents. Updated 2026.
        </p>

        {/* PDF selector */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {RULES_PDFS.map((pdf, i) => (
            <button
              key={i}
              onClick={() => setSelected(pdf)}
              className="px-4 py-2 rounded-lg border text-sm font-medium transition"
              style={{
                backgroundColor: selected.url === pdf.url ? '#2563eb' : 'var(--bg-card)',
                color: selected.url === pdf.url ? 'white' : 'var(--text-primary)',
                borderColor: selected.url === pdf.url ? '#2563eb' : 'var(--border)',
              }}
            >
              {pdf.label}
            </button>
          ))}
        </div>

        {/* Download link for mobile */}
        <div className="flex items-center gap-3 mb-4">
          <a
            href={selected.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            📥 Download PDF
          </a>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            (recommended on mobile)
          </span>
        </div>

        {/* PDF iframe — desktop */}
        <div className="hidden md:block rounded-xl overflow-hidden border shadow"
          style={{ borderColor: 'var(--border)', height: '80vh' }}>
          <iframe
            src={selected.url}
            className="w-full h-full"
            title={selected.label}
          />
        </div>

        {/* Mobile fallback */}
        <div className="md:hidden rounded-xl p-6 text-center border"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <p className="text-4xl mb-3">📄</p>
          <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {selected.label}
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            PDF viewing is best on desktop. On mobile, please download the file.
          </p>
          <a
            href={selected.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700"
          >
            📥 Open / Download PDF
          </a>
        </div>
      </div>
    </div>
  )
}