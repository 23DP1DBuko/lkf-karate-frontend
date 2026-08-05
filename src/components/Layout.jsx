import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import ContinueExamBanner from './ContinueExamBanner'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Skip navigation link — first focusable element for keyboard users */}
      <a href="#main-content" className="skip-link" onClick={() => document.getElementById('main-content')?.focus()}>Skip to main content</a>
      <Sidebar />
      <ContinueExamBanner />
      <main id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-6 pb-24 md:pb-6 w-full overflow-x-hidden">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}