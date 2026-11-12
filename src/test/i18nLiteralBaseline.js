/*
 * Configuration for the i18n literal guard (src/test/i18nLiterals.test.js).
 *
 * ALLOWED_TOKENS — literals that are correct as they are and must never be
 * translated. Keep this list short: brand and product names, standards and file
 * formats. Everything else belongs in lv/ru/en.json.
 *
 * LEGACY_LITERALS — literals that were hardcoded before the guard existed, grouped
 * by file. This is technical debt from Phase 2, not an endorsement: each entry is a
 * string that should become a t() call. Delete the entries for a file as you
 * localize it — the guard fails on entries that no longer occur, so the baseline
 * can only shrink. Never add to it to make a new string pass; add the key instead.
 */
export const ALLOWED_TOKENS = [
  // Federation and platform branding
  'LKF',
  'Academy',
  // Karate bodies and divisions that are never translated
  'WKF',
  'EKF',
  'AKA',
  'AO',
  // Standards and file formats
  'GDPR',
  'PDF',
]

export const LEGACY_LITERALS = {
  "App.jsx": [
    "Loading...",
  ],
  "components/AuthLayout.jsx": [
    "Back",
  ],
  "components/BlockEditor.jsx": [
    "+ Add row",
    "AKA video URL (YouTube or direct link) — leave AO empty for a single centered video",
    "AO video URL (optional — adds a second labeled video)",
    "Add Block",
    "Aka / Ao (video)",
    "Correct answer",
    "Correct:",
    "From question bank",
    "List items (one per line)",
    "Loading...",
    "Multiple Choice (multi-select)",
    "No questions found",
    "Note text",
    "Options (one per line)",
    "Question Bank (",
    "Question text",
    "Select all correct options",
    "Select correct answer",
    "Single Choice",
    "Type",
    "Yes / No",
    "YouTube URL",
    "id:",
    "⚠ needs review (from PDF import)",
    "⚠ needs review (from PDF import) — check the grid",
    "✕ Close",
  ],
  "components/BottomNav.jsx": [
    "Admin Panel",
  ],
  "components/ChapterBlocks.jsx": [
    "Answer",
    "Correct!",
    "No video",
    "Q.",
    "This question type is not supported yet — answer below as free text.",
    "Wrong, try again",
    "⚠ needs review",
    "✓ Correct:",
  ],
  "components/ChapterPreviewModal.jsx": [
    "Chapter",
    "Chapter Quiz (",
    "Close Preview",
    "Preview",
    "This chapter has no content yet.",
    "This is how the chapter appears to students",
    "questions)",
  ],
  "components/ContinueExamBanner.jsx": [
    "Continue",
    "Continue exam",
    "Dismiss",
    "You have an unfinished attempt for",
  ],
  "components/DateTimeStepPicker.jsx": [
    "Date",
    "Time",
  ],
  "components/ErrorBoundary.jsx": [
    "Error details",
  ],
  "components/LandingFooter.jsx": [
    "© 2026 LKF Academy",
  ],
  "components/Layout.jsx": [
    "Skip to main content",
  ],
  "components/MediaUpload.jsx": [
    "Remove media",
  ],
  "components/MobileNav.jsx": [
    "LKF Academy",
  ],
  "components/questions/AkaAoQuestion.jsx": [
    "No video",
    "No video attached to this question yet.",
    "Submitting…",
  ],
  "components/questions/MultipleChoiceQuestion.jsx": [
    "Submitting…",
  ],
  "components/questions/OpenTextQuestion.jsx": [
    "Submitting…",
  ],
  "components/questions/YesNoQuestion.jsx": [
    "Submitting…",
  ],
  "components/Sidebar.jsx": [
    "Admin",
    "LKF Academy",
    "LKF Karate",
  ],
  "pages/admin/AdminChapters.jsx": [
    "(base)",
    "Base Language",
    "English (EN)",
    "Lang",
    "Latviešu (LV)",
    "Next",
    "Previous",
    "Saving new order...",
    "Select a course",
    "Showing",
    "Translating...",
    "Video URL",
    "of",
    "Русский (RU)",
    "🌐 Translate",
  ],
  "pages/admin/AdminChaptersImport.jsx": [
    "INTRODUCTION / ARTICLE / APPENDIX",
  ],
  "pages/admin/AdminCourses.jsx": [
    "Kata",
    "Kumite",
    "Secretary",
    "Seminar",
  ],
  "pages/admin/AdminExamResults.jsx": [
    "(0 pts)",
    "(1 pt)",
    "Current score:",
  ],
  "pages/admin/AdminExams.jsx": [
    "Select a course",
    "m",
  ],
  "pages/admin/AdminImport.jsx": [
    "Importing...",
    "Match key: course + order",
    "Parsing...",
    "Select course",
    "attach translation",
    "create",
    "more",
    "questions (#",
    "skip",
    "update answer",
    "⚪ Same order, same text, same answer →",
    "🔵 Same order, missing language →",
    "🟡 Same order, answer changed →",
    "🟢 New order number →",
  ],
  "pages/admin/AdminPdfImport.jsx": [
    "p.",
  ],
  "pages/admin/AdminQuestions.jsx": [
    "Add options above first.",
    "Remove",
  ],
  "pages/Landing.jsx": [
    "LKF Academy",
    "Latvijas Karatē federācija",
    "Skip to main content",
  ],
  "pages/landing/Rules.jsx": [
    "Skip to main content",
  ],
  "pages/student/ChapterDetail.jsx": [
    "This chapter has no content yet.",
    "questions answered correctly",
  ],
  "pages/student/CourseDetail.jsx": [
    "min",
  ],
  "pages/student/Courses.jsx": [
    "No chapters available yet",
    "✓ Completed",
  ],
  "pages/student/Profile.jsx": [
    "Bolderājas Karatē klubs",
    "Daugavpils karatē skola",
    "Fudzi Sporta Klubs",
    "Ippon.lv",
    "Latvia",
    "Latvijas Godžju-rju Karatē Federācija",
    "Leonīda Vasiļjeva Karatē skola",
    "Ruslana Sadikova sporta skola",
    "Rīgas Karatē Klubs",
    "Salaspils Karatē Klubs",
    "Sochin Karate Klub",
    "Tan",
  ],
  "pages/student/QuickQuiz.jsx": [
    "Quick Quiz —",
  ],
}
