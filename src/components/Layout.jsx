import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import ContinueExamBanner from './ContinueExamBanner'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar />
      <ContinueExamBanner />
      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 w-full overflow-x-hidden">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}