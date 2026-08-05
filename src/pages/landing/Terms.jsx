import { Link } from 'react-router-dom'
import { useTheme } from '../../context/useTheme'
import { usePageTitle } from '../../hooks/usePageTitle'
import LandingHeader from '../../components/LandingHeader'
import LandingFooter from '../../components/LandingFooter'

export default function Terms() {
  const { theme } = useTheme()
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  usePageTitle('Terms of Service')

  const bgColor = isDark ? '#03010A' : '#f1f5f9'

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
      {/* Skip navigation link */}
      <a href="#main-content" className="skip-link" onClick={() => document.getElementById('main-content')?.focus()}>Skip to main content</a>

      <LandingHeader isDark={isDark}>
        <Link to="/login" className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
          isDark
            ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-blue-500/10'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
        }`}>Sign In</Link>
      </LandingHeader>

      <main id="main-content" tabIndex={-1} className="pt-24 pb-16 flex-1">
        <div className="max-w-3xl mx-auto px-4">
          <Link
            to="/"
            className={`inline-flex items-center gap-1.5 text-sm mb-8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
              isDark ? 'text-slate-400 hover:text-blue-400' : 'text-slate-500 hover:text-blue-600'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>

          <div className={`rounded-2xl p-8 md:p-10 border backdrop-blur-sm ${
            isDark
              ? 'bg-white/[0.03] border-white/[0.08]'
              : 'bg-white/60 border-slate-200/60 shadow-sm'
          }`}>
            <h1 className={`text-2xl md:text-3xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              Lietošanas noteikumi
            </h1>
            <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Spēkā no 2026. gada 1. janvāra
            </p>

            <div className={`space-y-6 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>1. Noteikumu pieņemšana</h2>
                <p>Izmantojot LKF Academy platformu, Jūs piekrītat šiem lietošanas noteikumiem. Ja Jūs nepiekrītat kādam no noteikumiem, lūdzu, neizmantojiet platformu.</p>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>2. Lietotāja pienākumi</h2>
                <ul className={`list-disc pl-5 mt-2 space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <li>Nodrošināt patiesu un precīzu reģistrācijas informāciju</li>
                  <li>Saglabāt sava konta drošību un konfidencialitāti</li>
                  <li>Neizmantot platformu nelikumīgiem mērķiem</li>
                  <li>Neeksportēt vai neizplatīt mācību materiālus bez atļaujas</li>
                </ul>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>3. Intelektuālais īpašums</h2>
                <p>Viss platformas saturs, ieskaitot mācību materiālus, testus un eksāmenus, ir LKF īpašums un ir aizsargāts ar autortiesību likumiem. Satura kopēšana, izplatīšana vai modificēšana bez rakstiskas atļaujas ir aizliegta.</p>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>4. Eksāmenu kārtība</h2>
                <p>Eksāmenu rezultātus apstiprina administrators. Krāpšanās vai negodīga rīcība eksāmenu laikā var izraisīt konta bloķēšanu un visu rezultātu anulēšanu.</p>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>5. Atbildības ierobežojums</h2>
                <p>LKF nav atbildīga par tiešiem vai netiešiem zaudējumiem, kas radušies, izmantojot platformu, ieskaitot bet neaprobežojoties ar datu zudumu vai pakalpojuma pārtraukumiem.</p>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>6. Noteikumu izmaiņas</h2>
                <p>Mēs paturam tiesības jebkurā laikā mainīt šos noteikumus. Par būtiskām izmaiņām Jūs tiksiet informēti pa e-pastu vai platformas paziņojumos.</p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter isDark={isDark} />
    </div>
  )
}
