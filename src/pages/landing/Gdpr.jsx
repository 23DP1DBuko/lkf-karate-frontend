import { Link } from 'react-router-dom'
import { useTheme } from '../../context/useTheme'
import { usePageTitle } from '../../hooks/usePageTitle'
import LandingHeader from '../../components/LandingHeader'
import LandingFooter from '../../components/LandingFooter'

export default function Gdpr() {
  const { theme } = useTheme()
  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  usePageTitle('GDPR')

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
              GDPR atbilstība
            </h1>
            <p className={`text-sm mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Vispārīgā datu aizsardzības regula (VDAR / GDPR)
            </p>

            <div className={`space-y-6 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>1. Datu pārzinis</h2>
                <p>Latvijas Karatē federācija (LKF) ir Jūsu personas datu pārzinis saskaņā ar Vispārīgo datu aizsardzības regulu (ES) 2016/679.</p>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>2. Datu apstrādes pamatojums</h2>
                <p>Mēs apstrādājam Jūsu personas datus, pamatojoties uz:</p>
                <ul className={`list-disc pl-5 mt-2 space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <li><strong>Līguma izpildi</strong> — lai nodrošinātu piekļuvi mācību platformai</li>
                  <li><strong>Juridisko pienākumu</strong> — lai izpildītu normatīvo aktu prasības</li>
                  <li><strong>Piekrišanu</strong> — kad esat devis nepārprotamu piekrišanu</li>
                  <li><strong>Leģitīmās intereses</strong> — lai uzlabotu platformas drošību un funkcionalitāti</li>
                </ul>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>3. Datu saņēmēji</h2>
                <p>Jūsu dati netiek nodoti trešajām personām, izņemot gadījumus, kas noteikti ar likumu. Dati tiek glabāti drošos serveros Eiropas Savienībā.</p>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>4. Datu glabāšanas termiņš</h2>
                <p>Jūsu personas dati tiek glabāti tik ilgi, kamēr Jums ir aktīvs konts platformā. Pēc konta dzēšanas dati tiek dzēsti 30 dienu laikā, izņemot gadījumus, kad tos nepieciešams saglabāt saskaņā ar normatīvajiem aktiem.</p>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>5. Jūsu tiesības saskaņā ar GDPR</h2>
                <ul className={`list-disc pl-5 mt-2 space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <li><strong>Tiesības piekļūt</strong> — pieprasīt informāciju par savu datu apstrādi</li>
                  <li><strong>Tiesības labot</strong> — labot neprecīzus vai nepilnīgus datus</li>
                  <li><strong>Tiesības dzēst</strong> ("tiesības tikt aizmirstam") — pieprasīt datu dzēšanu</li>
                  <li><strong>Tiesības ierobežot</strong> — ierobežot datu apstrādi</li>
                  <li><strong>Tiesības uz datu pārnesamību</strong> — saņemt datus strukturētā formātā</li>
                  <li><strong>Tiesības iebilst</strong> — iebilst pret datu apstrādi tiešā mārketinga nolūkos</li>
                </ul>
              </section>

              <section>
                <h2 className={`text-base font-semibold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>6. Kontaktinformācija un sūdzības</h2>
                <p>Ja uzskatāt, ka Jūsu dati tiek apstrādāti neatbilstoši, Jums ir tiesības iesniegt sūdzību:</p>
                <ul className={`list-disc pl-5 mt-2 space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <li>Mums pa e-pastu: <span className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`}>info@karate.lv</span></li>
                  <li>Datu valsts inspekcijai: <span className={`${isDark ? 'text-blue-400' : 'text-blue-600'}`}>www.dvi.gov.lv</span></li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter isDark={isDark} />
    </div>
  )
}
