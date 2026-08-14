# 🥋 LKF Karate LMS
### Latvijas Karatē Federācijas Apmācību Kursu Platforma

> **Diploma projekts** | Rīgas Valsts tehnikums | DP3-1 | 3. kurss  
> **Autors:** Deniss Bukovskis  
> **Gads:** 2026

---

## 📋 Projekta apraksts

LKF Karate LMS ir pilna steka tīmekļa lietojumprogramma, kas paredzēta Latvijas Karatē federācijas tiesnešu un sacensību sekretāru kvalifikācijas pilnveidei. Platforma ļauj tiesnešiem apgūt kursus, kārtot kvalifikācijas eksāmenus, sekot savam progresam un skatīt sacensību/semināru/eksāmenu kalendāru.

### 🌐 Publicētās saites
- **Frontend:** https://lkf-karate-frontend.vercel.app
- **Backend Admin:** https://lkf-karate-backend.onrender.com/admin

---

## 🛠️ Tehnoloģiju steks

### Frontend
| Tehnoloģija | Versija | Mērķis |
|---|---|---|
| React | 19 | UI bibliotēka |
| Vite | 8 | Build rīks |
| Tailwind CSS | 4 | Stilizēšana |
| TanStack Query | 5 | Servera stāvoklis |
| React Router | 7 | Maršrutēšana |
| Axios | 1.x | HTTP pieprasījumi |
| TipTap | 3 | Bagātināts teksta redaktors |
| i18next | 26 | Daudzvalodība (LV/RU/EN) |
| Heroicons | 2 | Ikonas |
| mammoth + JSZip | 1 / 3 | Word (.docx) jautājumu parsēšana |
| pdfjs-dist | 4 | PDF nodaļu parsēšana (imports) |
| react-easy-crop | 6 | Profila attēla apgriešana |
| motion / ogl | 12 / 1 | Animācijas un 3D vizuāļi (Landing) |
| Vite PWA Plugin | 1.2 | PWA atbalsts |
| Vitest | 4 | Testēšana |

### Backend
| Tehnoloģija | Versija | Mērķis |
|---|---|---|
| Strapi | 5 | Headless CMS + REST API |
| Node.js | 22 | Servera vide |
| PostgreSQL | 17 | Produkcijas datubāze |
| SQLite | 3 | Lokālās izstrādes datubāze |
| Nodemailer | 6 | E-pasta sūtīšana |

### Izvietošana
| Pakalpojums | Mērķis |
|---|---|
| Vercel | Frontend hosting |
| Render | Backend + PostgreSQL hosting |

---

## ✅ Skolas vērtēšanas kritēriji

| Kritērijs | Statuss | Apraksts |
|---|---|---|
| DBMS ar CRUD | ✅ | PostgreSQL + pilns CRUD visiem entītijiem |
| Autentifikācija + lomas | ✅ | JWT + 3 lomas: Viesis / Students / Admins |
| Kārtošana / filtri / meklēšana | ✅ | Kursu meklēšana + filtrēšana pēc kategorijas, pasākumu filtrs kalendārā |
| PWA | ✅ | Manifest + Service Worker + offline kešošana |
| OWASP drošība | ✅ | CSP, HSTS, X-Frame-Options, CORS, bcrypt |
| WCAG pieejamība | ✅ | Lighthouse Accessibility 90-96, modāļu fokusa uztveršana (focus trap) |
| Vismaz 5 testi | ✅ | 7 vienību testi ar Vitest |
| Izvietošana | ✅ | Vercel + Render |
| README + ERD | ✅ | Šis dokuments + datu modeļa shēma |
| Daudzvalodība | ✅ | Latviešu / Krievu / Angļu |

---

## 🔐 Drošības pasākumi (OWASP Top 10)

| OWASP Kategorija | Ieviestais risinājums |
|---|---|
| A02 - Kriptogrāfijas kļūmes | bcrypt parolu hešošana, JWT ar derīguma termiņu |
| A03 - Injekcija | Strapi ORM novērš SQL injekciju |
| A05 - Drošības nepareiza konfigurācija | Content-Security-Policy, X-Frame-Options, HSTS, X-Content-Type-Options |
| A07 - Autentifikācijas kļūmes | JWT tokeni, lomas pārbaude katrā pieprasījumā, īpašumtiesību pārbaudes (ownership checks) |
| A09 - CORS | Ierobežots tikai uz zināmām frontenda URL |

**HTTP atbildes galvenes:**
```
Content-Security-Policy: connect-src 'self' https:; img-src 'self' data: blob: https:
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-DNS-Prefetch-Control: off
Referrer-Policy: no-referrer
```

---

## 👥 Lietotāju lomas

### 👤 Viesis (neautentificēts)
- Skatīt sākumlapu
- Skatīt WKF sacensību noteikumus (/rules) — bez pieteikšanās
- Reģistrēties / Ieiet

### 🎓 Students (autentificēts, apstiprināts)
- Skatīt un apgūt kursus ar bloku saturu (teksts, video, attēli, jautājumi)
- Lasīt nodaļas MOOC stilā
- Kārtot nodaļu testus (jautājumi no blokiem vai jautājumu bankas)
- Kārtot kvalifikācijas eksāmenus (ar atsākšanas iespēju — auto-save)
- Ātrais tests (nejaušas jautājumu)
- Skatīt savus rezultātus
- Skatīt pasākumu kalendāru (**Kalendārs** — sacensības, semināri, eksāmeni)
- Pārvaldīt profilu + mainīt paroli + apgriezt profila attēlu
- Mainīt valodu (LV/RU/EN) un tēmu (gaišs/tumšs)

### 🔑 Admins (isAdmin = true)
- Viss ko Students
- CRUD kursi, nodaļas, jautājumi, eksāmeni (ar eksāmenu grafiku: `openAt`/`closeAt`)
- Bloku redaktors nodaļām (teksts, video, attēli, piezīmes, jautājumi)
- Jautājumu importēšana no Word dokumentiem ar dedup loģiku
- Nodaļu importēšana no WKF noteikumu PDF failiem
- Apstiprināt / noraidīt lietotājus
- Skatīt un vērtēt eksāmenu atbildes (manuāla vērtēšana atvērtajiem jautājumiem)
- Publicēt eksāmenu rezultātus
- Dzēst visus jautājumus kursam (ar apstiprinājumu)

---

## 🗓️ Kalendārs (pasākumi)

Platformā ir pilnvērtīga **Kalendārs** sadaļa (`/events`), kas rāda sacensības, seminārus un eksāmenus:

- **Gada/mēneša sadaļas** — visi mēneša pasākumi vertikālā sarakstā (ne tikai 3)
- **Filtrs** — "Filtrs: Visi pasākumi ▾" (Visi / Eksāmeni / Sacensības / Semināri)
- **Pasākumu kartītes** — datuma bloks (diena + lokalizēta nedēļas diena), pasākuma tipa etiķete (SACENSĪBAS / SEMINĀRS / EKSĀMENS) ar laiku, nosaukums, tipa ikona + bultiņa ar "Skatīt detaļas" tooltip
- **Daudzdienu sacensības** — viena kartīte ar datumu diapazonu (piem., 10 Pirm – 12 Treš)
- **Detalizēts modāls** — eksāmeniem rāda jautājumu skaitu un nokārtošanas slieksni
- **Mēneša navigācija** — tukšiem mēnešiem tiek rādīts informatīvs tukšuma stāvoklis ("Šim mēnesim nav plānoto pasākumu")
- **Dashboard integrācija** — "Kalendārs" kartīte ar tekošo mēnesi un ◀ ▶ navigāciju

Dati pašlaik ir **frontenda paraugdati** (`src/data/events.js`) ar LV/RU/EN tulkojumiem — plānots pārcelt uz Strapi `event` satura tipu.

---

## 📊 Datu modelis (ERD)

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────────┐
│      User       │     │     Course      │     │       Chapter        │
├─────────────────┤     ├─────────────────┤     ├──────────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)              │
│ username        │     │ title           │     │ title                │
│ email           │     │ description     │     │ content (HTML)       │
│ password (hash) │     │ slug            │     │ blocks (JSON)        │
│ firstName       │     │ category        │     │ order (auto)         │
│ lastName        │     │ published       │     │ course_id (FK)       │
│ isAdmin         │     │                 │     │ questions (M2M)      │
│ verification    │     └────────┬────────┘     └──────────┬───────────┘
│ rejectionReason │              │                          │
└────────┬────────┘              │ 1:N                      │ 1:N
         │                       │                          │
         │         ┌─────────────▼────┐        ┌───────────▼─────┐
         │         │    Question      │        │ ChapterProgress  │
         │         ├──────────────────┤        ├─────────────────┤
         │         │ id (PK)          │        │ id (PK)         │
         │         │ text             │        │ seen            │
         │         │ textLv           │        │ seenAt          │
         │         │ textRu           │        │ user_id (FK)    │
         │         │ textEn           │        │ chapter_id (FK) │
         │         │ type             │        └─────────────────┘
         │         │ options (JSON)   │
         │         │ correctAnswer    │
         │         │ order            │
         │         │ sourceFile       │
         │         │ sourceLang       │
         │         │ media (FK)       │
         │         │ course_id (FK)   │
         │         │ chapter_id (FK)  │
         │         └──────────────────┘
         │
         │    ┌─────────────────┐     ┌─────────────────────┐
         │    │      Exam       │     │    ExamAttempt      │
         │    ├─────────────────┤     ├─────────────────────┤
         │    │ id (PK)         │     │ id (PK)             │
         │    │ title           │     │ questions (JSON)    │
         │    │ duration        │     │ answers (JSON)      │
         │    │ questionCount   │     │ score               │
         │    │ passingScore    │     │ passed              │
         │    │ openAt          │     │ startedAt           │
         │    │ closeAt         │     │ submittedAt         │
         │    │ showResults     │     │ timeSpentSeconds    │
         │    │ resultsReleased │     │ exam_id (FK)        │
         │    │ course_id (FK)  │     │ user_id (FK)        │
         │    └─────────────────┘     └─────────────────────┘
         │
         └─────────────────────────────────────────────────────┘
```

### Sakarības
| Entītijs | Sakarība | Entītijs |
|---|---|---|
| Course | 1:N | Chapter |
| Course | 1:N | Question |
| Course | 1:N | Exam |
| Chapter | N:M | Question (no jautājumu bankas) |
| Exam | N:M | Question (izvēlētie jautājumi) |
| User | 1:N | ExamAttempt |
| Exam | 1:N | ExamAttempt |
| User | 1:N | ChapterProgress |
| Chapter | 1:N | ChapterProgress |

---

## 📦 Bloku redaktors (BlockEditor)

Nodaļas saturs ir veidots no brīvi sakārtojamiem blokiem:

| Bloka tips | Apraksts |
|---|---|
| `text` | Bagātināts teksts (TipTap) ar formatēšanu |
| `video` | YouTube video iegulšana ar priekšskatījumu |
| `image` | Attēla augšupielāde uz Strapi mediju bibliotēku ar drag & drop |
| `note` | Informatīva piezīme / callout bloks |
| `question` | Manuāli izveidots jautājums (tikai nodaļā) |
| `bank_question` | Jautājums no jautājumu bankas (saistīts ar Question entītiju) |

Bloki tiek saglabāti kā JSON laukā `blocks` un renderēti secīgi studentam. Blokus var pārkārtot ar bultiņu pogām.

---

## 📥 Jautājumu importēšana

Jautājumus var importēt no Word (.docx) failiem:

- **Formāts:** numurēti jautājumi (1. 2. 3.) ar krāsu kodējumu
  - 🟢 Zaļš teksts = `true` (pareiza atbilde)
  - 🔴 Sarkans teksts = `false` (nepareiza atbilde)
- **Dedup loģika:** atbilstība pēc `course + order`
  - Jauns jautājums → izveidot
  - Esošs jautājums, trūkst tulkojuma → pievienot tulkojumu
  - Esošs jautājums, mainīta atbilde → atjaunināt
  - Identisks → izlaist
- **Valodu atbalsts:** LV / RU / EN — katru valodu importē atsevišķi ar vienu un to pašu failu
- **Versiju izsekošana:** `sourceFile` lauks glabā faila nosaukumu katram jautājumam

### 📄 Nodaļu imports no PDF

WKF noteikumu PDF failus var sadalīt nodaļās automātiski (`/admin/chapters/import`):
- PDF tiek parsēts ar `pdfjs-dist`, virsraksti tiek atklāti kā nodaļas
- Pirms importēšanas var rediģēt nosaukumus, sakļaut/izvērst saturu
- Saturs tiek saglabāts kā bloku struktūra ar tulkotājiem laukiem (LV/RU/EN)

---

## 🔌 API Galapunkti

### Autentifikācija (publisks)
| Metode | Ceļš | Apraksts |
|---|---|---|
| POST | /api/auth/local | Ieiet |
| POST | /api/auth/local/register | Reģistrēties |
| POST | /api/auth/forgot-password | Aizmirsta parole |
| POST | /api/auth/reset-password | Atjaunot paroli |

### Saturs (autentificēts)
| Metode | Ceļš | Apraksts |
|---|---|---|
| GET | /api/courses | Visi kursi |
| GET | /api/courses/:id | Kursa detaļas |
| GET | /api/chapters | Visas nodaļas |
| GET | /api/chapters/:id | Nodaļas detaļas ar blokiem |
| GET | /api/questions | Visi jautājumi |

### Eksāmeni (pielāgoti galapunkti)
| Metode | Ceļš | Apraksts |
|---|---|---|
| POST | /api/exams/start | Sākt eksāmenu (vai atsākt nepabeigtu mēģinājumu) |
| POST | /api/exams/submit | Iesniegt eksāmenu (automātiska vērtēšana) |
| POST | /api/exams/save-progress | Saglabāt atbildes eksāmena laikā |
| POST | /api/exams/quick-quiz | Ātrais tests |

### Progresa izsekošana un saskaitne
| Metode | Ceļš | Apraksts |
|---|---|---|
| GET | /api/chapter-progress | Lietotāja nodaļu progress |
| POST | /api/chapter-progress/mark-seen | Atzīmēt nodaļu kā pabeigtu |
| GET | /api/exam-attempts | Lietotāja eksāmenu mēģinājumi |
| GET | /api/exam-attempts/:id | Viena mēģinājuma detaļas (tikai īpašnieks) |
| GET | /api/exam-attempts/all | Visi mēģinājumi (tikai admins) |
| PUT | /api/exam-attempts/grade/:id | Manuāla vērtēšana (tikai admins) |
| GET | /api/dashboard | Saskaitnes dati (statistika, jaunākie rezultāti, tuvākais eksāmens) |
| DELETE | /api/account/delete | Konta dzēšana |

---

## 🚀 Uzstādīšana un palaišana

### Prasības
- Node.js v20-v24
- npm v10+
- Git

### Lokālā izstrāde

**1. Klonēt repozitoriju**
```bash
git clone https://github.com/23DP1DBuko/lkf-karate-backend.git
git clone https://github.com/23DP1DBuko/lkf-karate-frontend.git
```

**2. Backend uzstādīšana**
```bash
cd lkf-karate-backend
npm install
cp .env.example .env
# Aizpildīt .env ar nepieciešamajām vērtībām
npm run develop
```

**3. Frontend uzstādīšana**
```bash
cd lkf-karate-frontend
npm install --legacy-peer-deps
npm run dev
```

**4. Atvērt pārlūkprogrammā**
- Frontend: http://localhost:5173
- Strapi Admin: http://localhost:1337/admin

### Vides mainīgie (Backend .env)
```env
HOST=0.0.0.0
PORT=1337
APP_KEYS=your-app-keys
API_TOKEN_SALT=your-salt
ADMIN_JWT_SECRET=your-admin-secret
JWT_SECRET=your-jwt-secret
DATABASE_CLIENT=sqlite
GMAIL_USER=your-gmail@gmail.com
GMAIL_PASS=your-gmail-app-password
FRONTEND_URL=http://localhost:5173
```

### Vides mainīgie (Frontend .env.local)
```env
VITE_API_URL=http://localhost:1337
```

---

## 🧪 Testi

```bash
cd lkf-karate-frontend
npm run test
```

### Testa gadījumi
| Tests | Apraksts |
|---|---|
| Login lapa renderējas | E-pasta un paroles lauki ir redzami |
| Pierakstīšanās poga | "Sign In" poga ir redzama |
| Saite uz reģistrāciju | Reģistrācijas saite ir redzama |
| Reģistrācijas lauki | Visi lauki (vārds, e-pasts, parole) |
| Reģistrācijas poga | "Register" poga ir redzama |
| Eksāmena rezultāts - nokārtots | Rāda 80% un "Congratulations!" |
| Eksāmena rezultāts - skaitlis | Rāda "8 out of 10 correct" |

> **Piezīme:** testu setup (`src/test/setup.js`) šobrīd nenodrošina `ThemeProvider`
> un citus providerus, tāpēc 5 no 7 testiem lokāli neiziet (Login/Register/ExamResult).
> Tas ir zināms setup jautājums, nevis lietotnes kļūda — nepieciešams pievienot
> provideru mockus vai wrapper renderēšanā.

---

## 📱 PWA (Progresīvā tīmekļa lietotne)

Lietojumprogramma atbalsta PWA standartu:
- ✅ Web App Manifest ar ikonu un tēmas krāsu
- ✅ Service Worker ar Workbox
- ✅ Offline kešošana (API atbildes 24h)
- ✅ Instalējama kā desktop/mobilo lietotne
- ✅ Optimizēta mobilajām ierīcēm

---

## 📱 Mobilā UX

- **Apakšējā navigācija** — galvenās sadaļas pieejamas ar vienu klikšķi
- **Admin panelis** — atveras kā apakšējais paplāte no navigācijas pogas
- **Saliekamais sānjosls** — admins var sakļaut ikonu režīmā ar tooltip vai atvērt kā pārklājumu
- **Pārvilkšanas žests** — velciet no kreisās malas, lai atvērtu sānjoslu
- **Pieskaršanās viļņi** — vizuāla atgriezeniskā saite uz katru pogu
- **Skeleta ekrāni** — ielādes laikā redzami skeleta ekrāni

---

## ♿ Pieejamība (WCAG 2.2)

Lighthouse pieejamības rezultāti:
| Lapa | Rezultāts |
|---|---|
| Sākumlapa | 90 |
| Pierakstīšanās | 96 |
| Reģistrācija | 91 |

Ieviestie pasākumi:
- `aria-label` uz visām ikonām un pogām
- `htmlFor` + `id` savienojumi formu laukiem
- `role="main"` galvenajam saturam
- Krāsu kontrasts ≥ 4.5:1
- Tastatūras navigācija
- **Fokusa uztveršana modāļos** (`useFocusTrap`) un aizvēršana ar `Escape` — modāļi atbilst WCAG 2.2 prasībām

---

## 🌍 Daudzvalodība

Platforma atbalsta 3 valodas:
- 🇱🇻 **Latviešu** (noklusējums)
- 🇷🇺 **Русский**
- 🇬🇧 **English**

Valodu var mainīt profilā. Izvēle tiek saglabāta localStorage. Pārlūka valoda tiek automātiski noteikta pirmajā apmeklējumā ar `i18next-browser-languagedetector`.

Visi atkārtotie teksti — navigācija, eksāmenu u.c. lapas, kā arī **kalendāra** mēnešu nosaukumi, nedēļas dienas, pasākumu tipi un filtri — ir definēti kā i18n atslēgas (`events.*`, `dashboard.*`, `nav.*`).

---

## 📁 Projekta struktūra

```
lkf-karate-frontend/
├── src/
│   ├── api/              # Axios instance + media URL helper + lokalizācijas helperi
│   ├── components/
│   │   ├── BlockEditor.jsx          # Bloku redaktors nodaļām
│   │   ├── RichTextEditor.jsx       # TipTap teksta redaktors
│   │   ├── LazyRichTextEditor.jsx   # Lazy ielāde redaktoram
│   │   ├── MediaUpload.jsx          # Failu augšupielāde ar drag & drop
│   │   ├── Sidebar.jsx              # Saliekamais sānjosls
│   │   ├── BottomNav.jsx            # Mobilā apakšējā navigācija
│   │   ├── MobileNav.jsx            # Mobilā navigācija (admin)
│   │   ├── IconButton.jsx           # Ikonu pogas ar tooltip
│   │   ├── Skeleton.jsx             # Ielādes skeleta ekrāni
│   │   ├── ChapterPreviewModal.jsx  # Nodaļas priekšskatījums
│   │   ├── ContinueExamBanner.jsx   # Nepabeigta eksāmena turpināšanas baneris
│   │   ├── CalendarCard.jsx         # Dashboard "Kalendārs" kartīte
│   │   ├── EventCard.jsx            # Pasākuma kartīte (1 dienas + daudzdienu)
│   │   ├── EventModal.jsx           # Pasākuma detaļu modāls
│   │   ├── EventEmptyState.jsx      # Tukšuma stāvoklis kalendārā
│   │   ├── DateTimeStepPicker.jsx   # Datuma/laika izvēlne (eksāmenu grafiks)
│   │   ├── QuestionReviewCard.jsx   # Atbilžu pārskata kartīte
│   │   ├── ErrorBoundary.jsx        # Kļūdu robeža
│   │   └── Toast.jsx                # Paziņojumi
│   ├── context/          # AuthContext, ThemeContext, ExamAttemptContext
│   ├── hooks/            # usePageTitle, useRipple, useFocusTrap
│   ├── i18n/             # Tulkojumi (lv, ru, en)
│   ├── data/events.js    # Kalendāra paraugdati (LV/RU/EN)
│   ├── pages/
│   │   ├── auth/         # Login, Register, ForgotPassword, ResetPassword, PendingApproval
│   │   ├── landing/      # Landing, Rules (publisks PDF skatītājs)
│   │   ├── student/      # UserDashboard, Courses, CourseDetail, ChapterDetail,
│   │   │                 # ExamPage, ExamResult, Results, QuickQuiz, Events, Profile
│   │   └── admin/        # AdminCourses, AdminChapters, AdminChaptersImport, AdminQuestions,
│   │                     # AdminExams, AdminExamResults, AdminUsers, AdminImport
│   └── test/             # Vitest testi
├── public/               # PWA ikonas, robots.txt
└── vite.config.js        # Vite + Tailwind 4 + PWA + kompresija + Vitest config
```

---

## 🔮 Nākotnes plāni (v2.0)

- 🗄️ **Event satura tips Strapī** — kalendāra datus pārcelt no frontenda paraugdatiem uz API ar admin CRUD
- 🤖 AI automātiskā vērtēšana (Google Gemini) atvērtā teksta jautājumiem
- 📊 Analītika — nokārtošanas statistika, grūtākie jautājumi
- 🔄 Auto-pārvērtēšana — mainot pareizo atbildi, automātiski pārrēķina rezultātus
- 📡 Reāllaika monitorings — vecākais tiesnesis redz eksāmena progresu
- 📜 PDF sertifikāti pēc nokārtošanas
- 🌐 Pilns daudzvalodīgs saturs (kursi/jautājumi LV/RU/EN)

*Projekts izstrādāts kā diploma darbs Rīgas Valsts tehnikumā.*
