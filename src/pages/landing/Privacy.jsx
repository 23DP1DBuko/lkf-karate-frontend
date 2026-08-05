import { Link } from 'react-router-dom'
import { useTheme } from '../../context/useTheme'
import { usePageTitle } from '../../hooks/usePageTitle'
import LandingHeader from '../../components/LandingHeader'
import LandingFooter from '../../components/LandingFooter'

export default function Privacy() {
  const { theme } = useTheme()
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  usePageTitle('Privacy Policy')

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
          {/* Back link */}
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

          {/* Content card */}
          <div className={`rounded-2xl p-8 md:p-10 border backdrop-blur-sm ${
            isDark
              ? 'bg-white/[0.03] border-white/[0.08]'
              : 'bg-white/60 border-slate-200/60 shadow-sm'
          }`}>
            <h1 className={`text-2xl md:text-3xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              Privātuma politika
            </h1>
            <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Spēkā no 2026. gada 1. janvāra
            </p>

            <div className={`space-y-6 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>1. Vispārīgie noteikumi</h2>
                <p>Šī privātuma politika nosaka, kā Latvijas Karatē federācija (LKF) apkopo, izmanto un aizsargā Jūsu personisko informāciju, ko sniedzat, izmantojot LKF Academy platformu.</p>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>2. Apkopotā informācija</h2>
                <p>Mēs varam apkopot šādu informāciju:</p>
                <ul className={`list-disc pl-5 mt-2 space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <li>Vārds un uzvārds</li>
                  <li>E-pasta adrese</li>
                  <li>Karatē klubs un rangs</li>
                  <li>Eksāmenu rezultāti un mācību progresi</li>
                  <li>Konta reģistrācijas dati</li>
                </ul>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>3. Informācijas izmantošana</h2>
                <p>Apkopoto informāciju izmantojam, lai:</p>
                <ul className={`list-disc pl-5 mt-2 space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <li>Nodrošinātu piekļuvi mācību materiāliem un eksāmeniem</li>
                  <li>Pārvaldītu lietotāju kontus un autentifikāciju</li>
                  <li>Sazinātos ar Jums par platformas atjauninājumiem</li>
                  <li>Uzlabotu platformas funkcionalitāti</li>
                </ul>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>4. Datu glabāšana un aizsardzība</h2>
                <p>Mēs īstenojam atbilstošus drošības pasākumus, lai aizsargātu Jūsu personisko informāciju pret neatļautu piekļuvi, izmaiņām, izpaušanu vai iznīcināšanu. Jūsu dati tiek glabāti tikai tik ilgi, cik nepieciešams sniegto pakalpojumu nodrošināšanai.</p>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>5. Jūsu tiesības</h2>
                <p>Jums ir tiesības:</p>
                <ul className={`list-disc pl-5 mt-2 space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <li>Piekļūt saviem personas datiem</li>
                  <li>Labot neprecīzus datus</li>
                  <li>Pieprasīt savu datu dzēšanu</li>
                  <li>Ierobežot datu apstrādi</li>
                  <li>Saņemt savus datus pārnesamā formātā</li>
                </ul>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>6. Kontaktinformācija</h2>
                <p>Ja Jums ir jautājumi par šo privātuma politiku, lūdzu, sazinieties ar mums pa e-pastu: <span className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`}>info@karate.lv</span></p>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <LandingFooter isDark={isDark} />
    </div>
  )
}
