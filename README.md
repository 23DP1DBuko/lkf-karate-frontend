# 🥋 LKF Karate LMS
### Latvijas Karatē Federācijas Apmācību Kursu Platforma

> **Diploma projekts** | Rīgas Valsts tehnikums | DP3-1 | 3. kurss  
> **Autors:** Deniss Bukovskis  
> **Gads:** 2026

---

## 📋 Projekta apraksts

LKF Karate LMS ir pilna steka tīmekļa lietojumprogramma, kas paredzēta Latvijas Karatē federācijas tiesnešu un sacensību sekretāru kvalifikācijas pilnveidei. Platforma ļauj tiesnešiem apgūt kursus, kārtot kvalifikācijas eksāmenus un sekot savam progresam.

### 🌐 Publicētās saites
- **Frontend:** https://lkf-karate-frontend.vercel.app
- **Backend Admin:** https://lkf-karate-backend-production.up.railway.app/admin

---

## 🛠️ Tehnoloģiju steks

### Frontend
| Tehnoloģija | Versija | Mērķis |
|---|---|---|
| React | 19 | UI bibliotēka |
| Vite | 8 | Build rīks |
| Tailwind CSS | 4 | Stilizēšana |
| TanStack Query | 5 | Servera stāvoklis |
| React Router | 6 | Maršrutēšana |
| Axios | 1.x | HTTP pieprasījumi |
| TipTap | 2 | Bagātināts teksta redaktors |
| i18next | 24 | Daudzvalodība (LV/RU/EN) |
| Heroicons | 2 | Ikonas |
| JSZip | 3 | Word dokumentu parsēšana |
| Vite PWA Plugin | 0.21 | PWA atbalsts |
| Vitest | 3 | Testēšana |

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
| Railway | Backend + PostgreSQL hosting |

---

## ✅ Skolas vērtēšanas kritēriji

| Kritērijs | Statuss | Apraksts |
|---|---|---|
| DBMS ar CRUD | ✅ | PostgreSQL + pilns CRUD visiem entītijiem |
| Autentifikācija + lomas | ✅ | JWT + 3 lomas: Viesis / Students / Admins |
| Kārtošana / filtri / meklēšana | ✅ | Kursu meklēšana + filtrēšana pēc kategorijas |
| PWA | ✅ | Manifest + Service Worker + offline kešošana |
| OWASP drošība | ✅ | CSP, HSTS, X-Frame-Options, CORS, bcrypt |
| WCAG pieejamība | ✅ | Lighthouse Accessibility 90-96 |
| Vismaz 5 testi | ✅ | 7 vienību testi ar Vitest |
| Izvietošana | ✅ | Vercel + Railway |
| README + ERD | ✅ | Šis dokuments + datu modeļa shēma |
| Daudzvalodība | ✅ | Latviešu / Krievu / Angļu |

---

## 🔐 Drošības pasākumi (OWASP Top 10)

| OWASP Kategorija | Ieviestais risinājums |
|---|---|
| A02 - Kriptogrāfijas kļūmes | bcrypt parolu hešošana, JWT ar derīguma termiņu |
| A03 - Injekcija | Strapi ORM novērš SQL injekciju |
| A05 - Drošības nepareiza konfigurācija | Content-Security-Policy, X-Frame-Options, HSTS, X-Content-Type-Options |
| A07 - Autentifikācijas kļūmes | JWT tokeni, lomas pārbaude katrā pieprasījumā |
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
- Kārtot kvalifikācijas eksāmenus
- Ātrais tests (nejaušas jautājumu)
- Skatīt savus rezultātus
- Pārvaldīt profilu + mainīt paroli
- Mainīt valodu (LV/RU/EN) un tēmu (gaišs/tumšs)

### 🔑 Admins (isAdmin = true)
- Viss ko Students
- CRUD kursi, nodaļas, jautājumi, eksāmeni
- Bloku redaktors nodaļām (teksts, video, attēli, piezīmes, jautājumi)
- Jautājumu importēšana no Word dokumentiem ar dedup loģiku
- Apstiprināt / noraidīt lietotājus
- Skatīt un vērtēt eksāmenu atbildes
- Publicēt eksāmenu rezultātus
- Dzēst visus jautājumus kursam (ar apstiprinājumu)

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
         │    │ showResults     │     │ exam_id (FK)        │
         │    │ resultsReleased │     │ user_id (FK)        │
         │    │ course_id (FK)  │     └─────────────────────┘
         │    └─────────────────┘
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
| POST | /api/exams/start | Sākt eksāmenu |
| POST | /api/exams/submit | Iesniegt eksāmenu |
| POST | /api/exams/quick-quiz | Ātrais tests |

### Progresa izsekošana
| Metode | Ceļš | Apraksts |
|---|---|---|
| GET | /api/chapter-progress | Lietotāja nodaļu progress |
| POST | /api/chapter-progress/mark-seen | Atzīmēt nodaļu kā pabeigtu |
| GET | /api/exam-attempts | Lietotāja eksāmenu mēģinājumi |
| GET | /api/exam-attempts/all | Visi mēģinājumi (tikai admins) |
| PUT | /api/exam-attempts/grade/:id | Manuāla vērtēšana (tikai admins) |

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
- Frontend: http://localhost:5174
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
| Tests | Apraksts | Statuss |
|---|---|---|
| Login lapa renderējas | E-pasta un paroles lauki ir redzami | ✅ |
| Pierakstīšanās poga | "Sign In" poga ir redzama | ✅ |
| Saite uz reģistrāciju | Reģistrācijas saite ir redzama | ✅ |
| Reģistrācijas lauki | Visi lauki (vārds, e-pasts, parole) | ✅ |
| Reģistrācijas poga | "Register" poga ir redzama | ✅ |
| Eksāmena rezultāts - nokārtots | Rāda 80% un "Congratulations!" | ✅ |
| Eksāmena rezultāts - skaitlis | Rāda "8 out of 10 correct" | ✅ |

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

---

## 🌍 Daudzvalodība

Platforma atbalsta 3 valodas:
- 🇱🇻 **Latviešu** (noklusējums)
- 🇷🇺 **Русский**
- 🇬🇧 **English**

Valodu var mainīt profilā. Izvēle tiek saglabāta localStorage. Pārlūka valoda tiek automātiski noteikta pirmajā apmeklējumā ar `i18next-browser-languagedetector`.

---

## 📁 Projekta struktūra

```
lkf-karate-frontend/
├── src/
│   ├── api/              # Axios instance + media URL helper
│   ├── components/
│   │   ├── BlockEditor.jsx          # Bloku redaktors nodaļām
│   │   ├── RichTextEditor.jsx       # TipTap teksta redaktors
│   │   ├── MediaUpload.jsx          # Failu augšupielāde ar drag & drop
│   │   ├── Sidebar.jsx              # Saliekamais sānjosls
│   │   ├── BottomNav.jsx            # Mobilā apakšējā navigācija
│   │   ├── IconButton.jsx           # Ikonu pogas ar tooltip
│   │   ├── Skeleton.jsx             # Ielādes skeleta ekrāni
│   │   └── ChapterPreviewModal.jsx  # Nodaļas priekšskatījums
│   ├── context/          # AuthContext, ThemeContext
│   ├── hooks/            # usePageTitle, useRipple
│   ├── i18n/             # Tulkojumi (lv, ru, en)
│   ├── pages/
│   │   ├── auth/         # Login, Register, ForgotPassword, ResetPassword
│   │   ├── landing/      # Landing, Rules (publisks PDF skatītājs)
│   │   ├── student/      # Courses, CourseDetail, ChapterDetail, ExamPage...
│   │   └── admin/        # AdminCourses, AdminChapters, AdminQuestions,
│   │                     # AdminExams, AdminExamResults, AdminUsers, AdminImport
│   └── test/             # Vitest testi
├── public/               # PWA ikonas, robots.txt
└── vite.config.js

lkf-karate-backend/
├── src/
│   ├── api/
│   │   ├── chapter/
│   │   ├── chapter-progress/
│   │   ├── course/
│   │   ├── exam/
│   │   ├── exam-attempt/
│   │   ├── exam-session/       # Pielāgoti galapunkti
│   │   └── question/
│   └── extensions/
│       └── users-permissions/
├── config/
│   ├── database.js       # SQLite/PostgreSQL konfigurācija
│   ├── middlewares.js    # CORS + drošības galvenes
│   └── plugins.js        # E-pasta konfigurācija
└── .env
```

---

## 🔮 Nākotnes plāni (v2.0)

- 🤖 AI automātiskā vērtēšana (Google Gemini) atvērtā teksta jautājumiem
- 📊 Analītika — nokārtošanas statistika, grūtākie jautājumi
- 🔄 Auto-pārvērtēšana — mainot pareizo atbildi, automātiski pārrēķina rezultātus
- 📡 Reāllaika monitorings — vecākais tiesnesis redz eksāmena progresu
- 📜 PDF sertifikāti pēc nokārtošanas
- 📅 Kalendārs ar eksāmenu atgādinājumiem
- 🌐 Pilns daudzvalodīgs saturs (kursi/jautājumi LV/RU/EN)
- 📄 PDF parsēšana — WKF noteikumu automātiska sadalīšana nodaļās

---

## 👨‍💻 Autors

**Deniss Bukovskis**  
DP3-1 | Rīgas Valsts tehnikums | 3. kurss | 2026

---

*Projekts izstrādāts kā diploma darbs Rīgas Valsts tehnikumā.*