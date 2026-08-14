import {
  CheckCircleIcon,
  PlusCircleIcon,
  QuestionMarkCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
// Classify an attempt as an exam or a quick quiz. Prefers the `kind` snapshot
// stored on the attempt at creation; falls back to the live relations and then
// to legacy heuristics for old attempts whose course/exam was deleted (quick
// quizzes always store passed=null, exams always store true/false).
export function getAttemptKind(attempt) {
  if (!attempt) return null;
  if (attempt.kind === "exam" || attempt.kind === "quick_quiz") return attempt.kind;
  if (attempt.exam) return "exam";
  if (attempt.course) return "quick_quiz";
  return attempt.passed === null ? "quick_quiz" : "exam";
}

// Shared rule for “can we show score + review?”
export function canShowScoreAndReview(attempt) {
  if (!attempt) return false;
  const kind = getAttemptKind(attempt);
  const isQuickQuiz = kind === "quick_quiz";
  // A deleted exam has no showResults flag left to check — once the admin
  // deletes the exam, the stored grade stays visible (nothing left to hide).
  const examDeleted = kind === "exam" && !attempt.exam;
  return (
    isQuickQuiz ||
    examDeleted ||
    (attempt.exam && attempt.exam.showResults === true) ||
    attempt.showResults === true
  );
}

// Shared grading check used by review displays (Results + admin grading).
// Multi-select multiple choice compares arrays by set equality; all other
// types compare the normalized single-answer strings. Open text is never
// auto-correct (it needs manual grading).
export function isAnswerCorrect(q, userAnswer) {
  if (q?.type === "open_text") return false;

  const correctAnswers =
    q?.type === "multiple_choice" &&
    Array.isArray(q.correctAnswers) &&
    q.correctAnswers.length > 0
      ? q.correctAnswers
      : null;

  if (correctAnswers) {
    if (!Array.isArray(userAnswer)) return false;
    const a = userAnswer.map(String).sort().join("|");
    const b = correctAnswers.map(String).sort().join("|");
    return a === b;
  }

  return (
    String(userAnswer ?? "").toLowerCase() ===
    String(q?.correctAnswer ?? "").toLowerCase()
  );
}

export function formatAnswerValue(value, q, t) {
  if (value === undefined || value === null || value === "") return "—";

  // Open text stays as typed
  if (q?.type === "open_text") return String(value);

  const yesLabel = t("exam.yes") || "Yes";
  const noLabel = t("exam.no") || "No";

  // Aka/Ao answers display as the AKA / AO labels
  if (q?.type === "aka_ao") {
    const v = String(value).trim().toLowerCase();
    if (v === "aka") return "AKA";
    if (v === "ao") return "AO";
    return String(value);
  }

  // Multiple-select answers arrive as arrays — format each entry
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value
      .map((entry) => formatAnswerValue(entry, q, t))
      .join(", ");
  }

  // Actual booleans
  if (typeof value === "boolean") return value ? yesLabel : noLabel;

  // String values that are "true"/"false"
  const v = String(value).trim();
  if (v.toLowerCase() === "true") return yesLabel;
  if (v.toLowerCase() === "false") return noLabel;

  return v;
}

export function getAttemptMeta(attempt, t) {
  const kind = getAttemptKind(attempt);
  const isQuickQuiz = kind === "quick_quiz";
  const isExam = kind === "exam";

  // Quick quiz: neutral blue
  if (isQuickQuiz) {
    return {
      kind: "quickQuiz",
      typeLabel: t("results.quickQuiz") || "Quick Quiz",
      title: attempt.course?.title || "Quiz",
      icon: PlusCircleIcon,
      color: "text-blue-500",
      border: "border-blue-400",
      scoreColor: "text-blue-500",
      statusLabel: "",
    };
  }

  // Exam, submitted
  if (isExam && attempt.submittedAt) {
    // A deleted exam counts as released — the grade must stay visible.
    const canShowResults =
      !attempt.exam || attempt.exam?.showResults === true;

    if (
      canShowResults &&
      typeof attempt.score === "number" &&
      attempt.passed === true
    ) {
      return {
        kind: "passed",
        typeLabel: t("results.exam") || "Exam",
        title: attempt.exam?.title || "—",
        icon: CheckCircleIcon,
        color: "text-green-500",
        border: "border-green-400",
        scoreColor: "text-green-500",
        statusLabel: t("results.passed") || "passed",
      };
    }

    if (
      canShowResults &&
      typeof attempt.score === "number" &&
      attempt.passed === false
    ) {
      return {
        kind: "failed",
        typeLabel: t("results.exam") || "Exam",
        title: attempt.exam?.title || "—",
        icon: XCircleIcon,
        color: "text-red-500",
        border: "border-red-400",
        scoreColor: "text-red-500",
        statusLabel: t("results.failed") || "failed",
      };
    }

    // Submitted exam, but results hidden
    return {
      kind: "unreleased",
      typeLabel: t("results.exam") || "Exam",
      title: attempt.exam?.title || "—",
      icon: QuestionMarkCircleIcon,
      color: "text-gray-400",
      border: "border-gray-500",
      scoreColor: "text-gray-400",
      statusLabel: t("results.unreleased") || "unreleased",
    };
  }

  // Fallback neutral
  return {
    kind: "neutral",
    typeLabel: t("results.quickQuiz") || "Quick Quiz",
    title: attempt.course?.title || "Quiz",
    icon: PlusCircleIcon,
    color: "text-blue-500",
    border: "border-blue-400",
    scoreColor: "text-blue-500",
    statusLabel: "",
  };
}

export function formatTimeSpent(seconds) {
  if (
    seconds === null ||
    seconds === undefined ||
    Number.isNaN(Number(seconds))
  ) {
    return null;
  }

  const total = Math.max(0, Math.floor(Number(seconds)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
