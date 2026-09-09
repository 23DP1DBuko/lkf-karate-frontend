// wordQuestionParser.js
// ---------------------------------------------------------------------------
// Parses Word (.docx) question files where the correct answer is encoded via
// text color:
//   - green  (#00B050) → correctAnswer 'true'
//   - red    (#FF0000) → correctAnswer 'false'
//
// Only questions that carry BOTH a question number and a color-coded answer
// are extracted (this preserves the historical Word-importer behavior exactly).
// The returned objects use the unified normalized shape shared with the PDF
// parsers: one Question per number, with the document language stored in the
// matching textLv/textRu/textEn field and the other languages left null (later
// imports may add them).
//
//   { order, textLv|textRu|textEn, type, correctAnswer, answerStatus: 'fromWord',
//     options, sourceFiles: [fileName] }
// ---------------------------------------------------------------------------

const COLOR_TRUE = '00B050' // green
const COLOR_FALSE = 'FF0000' // red

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Parse a Word (.docx) file into normalized question objects.
 *
 * @param {File} file             the .docx file
 * @param {object} [options]      { language: 'en' | 'lv' | 'ru' } — the language
 *                                the document is written in (default 'lv')
 * @returns {Promise<Array>}      normalized questions (order, textX, correctAnswer…)
 */
export async function parseWordQuestions(file, { language = 'lv' } = {}) {
  const JSZip = (await import('jszip')).default
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const xml = await zip.file('word/document.xml').async('string')

  const paragraphRegex = /<w:p[ >][\s\S]*?<\/w:p>/g
  const colorRegex = /<w:color w:val="([^"]+)"/i
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  const numberRegex = /^(\d+)[.)]\s*/

  const textKey = `text${cap(language)}`
  const questions = []
  const paragraphs = xml.match(paragraphRegex) || []

  for (const para of paragraphs) {
    let text = ''
    let match
    while ((match = textRegex.exec(para)) !== null) text += match[1]
    textRegex.lastIndex = 0

    text = text.trim()
    if (!text || text.length < 5) continue

    const numMatch = text.match(numberRegex)
    if (!numMatch) continue

    const order = parseInt(numMatch[1], 10)
    const cleanText = text.replace(numberRegex, '').trim()

    const colorMatch = para.match(colorRegex)
    if (!colorMatch) continue

    const color = colorMatch[1].toUpperCase()
    let answer = null
    if (color === COLOR_TRUE) answer = 'true'
    else if (color === COLOR_FALSE) answer = 'false'

    if (answer && cleanText) {
      questions.push({
        order,
        [textKey]: cleanText,
        type: 'yes_no',
        options: ['true', 'false'],
        correctAnswer: answer,
        answerStatus: 'fromWord',
        sourceFiles: [file?.name || 'document.docx'],
      })
    }
  }

  return questions
}
