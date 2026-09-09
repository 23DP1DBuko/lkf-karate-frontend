// verify-ui.mjs — headless-Chrome smoke test for the open-text exam feature UI.
//
// Drives the real dev servers (frontend :5174, backend :1337) via Chrome DevTools
// Protocol and asserts the key flows render without console errors:
//   1. login page loads
//   2. admin logs in
//   3. /admin/questions renders; the open-text form can add/remove answer fields
//      and create a question with 3 fields
//   4. /admin/results renders
//   5. student dashboard renders
//
// Chrome must be started externally with the matching CDP port, e.g.:
//   chrome --headless=new --remote-debugging-port=9244 --no-first-run \
//          --disable-gpu --no-sandbox --user-data-dir=$(mktemp -d) about:blank &
//   CDP_PORT=9244 node scripts/verify-ui.mjs
//
// The script builds button/label matchers from the real i18n locale files so it
// works regardless of the browser's detected language.

import { readFileSync } from 'node:fs'

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5174'
const PORT = Number(process.env.CDP_PORT || 9222)

// ── Translation-aware matchers ─────────────────────────────────────────────
const readLocale = (lang) =>
  JSON.parse(readFileSync(new URL(`../src/i18n/locales/${lang}.json`, import.meta.url), 'utf8'))
const LOCALES = { en: readLocale('en'), lv: readLocale('lv'), ru: readLocale('ru') }

const alt = (...keys) => {
  const values = []
  for (const lang of ['en', 'lv', 'ru']) {
    let cur = LOCALES[lang]
    for (const k of keys) cur = cur?.[k]
    if (typeof cur === 'string' && cur.trim()) values.push(cur.trim())
  }
  return values
}
// Regex source matching any of the three languages for a nested key path.
const reSrc = (...keys) =>
  alt(...keys)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')

const results = []
const check = (name, ok, extra = '') => {
  results.push({ name, ok, extra })
  console.log(`  ${ok ? '✅ PASS' : '❌ FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`)
}

let ws
let msgId = 0
const pending = new Map()
const consoleErrors = []

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function connect() {
  let target
  let lastErr = ''
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`)
      const list = await res.json()
      target = list.find((t) => t.type === 'page')
      if (target) break
      lastErr = `no page target (${list.length} targets)`
    } catch (e) {
      lastErr = e.message
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  if (!target) throw new Error(`No CDP page target (${lastErr})`)

  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    } else if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(msg.params.exceptionDetails?.text || 'exception')
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args?.map((a) => a.value ?? a.description ?? '').join(' '))
    }
  }
  await send('Runtime.enable')
  await send('Page.enable')
}

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'evaluation failed')
  }
  return res.result?.value
}

async function navigate(url) {
  await send('Page.navigate', { url })
  await waitFor(() => evaluate('document.readyState === "complete"'))
  await new Promise((r) => setTimeout(r, 1200))
}

async function waitFor(fn, timeout = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      if (await fn()) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('waitFor timed out')
}

// Click a button by (translated) text.
async function clickButtonByText(pattern) {
  const ok = await evaluate(`(() => {
    const els = [...document.querySelectorAll('button')]
    const el = els.find(e => (e.textContent || '').trim() !== '' && new RegExp(${JSON.stringify(pattern)}).test(e.textContent))
    if (!el) return false
    el.click()
    return true
  })()`)
  if (!ok) throw new Error(`button not found: ${pattern}`)
  await new Promise((r) => setTimeout(r, 400))
}

async function main() {
  try {
    await connect()
    console.log('\n== Open-text UI verification ==\n')

    // 1 ── login page ──────────────────────────────────────────────────────
    await navigate(`${FRONTEND}/login`)
    check('login page renders', await evaluate(`!!document.querySelector('input')`))

    // 2 ── admin login ─────────────────────────────────────────────────────
    await evaluate(`(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      const id = document.getElementById('email') || document.querySelector('input[type="email"]')
      const pw = document.getElementById('password') || document.querySelector('input[type="password"]')
      setter.call(id, 'admin@gmail.com')
      id.dispatchEvent(new Event('input', { bubbles: true }))
      setter.call(pw, 'Admin123')
      pw.dispatchEvent(new Event('input', { bubbles: true }))
    })()`)
    await evaluate(`(() => {
      const form = document.querySelector('form')
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      return !!form
    })()`)
    await waitFor(() => evaluate(`!location.pathname.includes('/login')`))
    check('admin logs in (redirected from /login)', await evaluate(`location.pathname`))

    // 3 ── admin questions: open-text form ─────────────────────────────────
    await navigate(`${FRONTEND}/admin/questions`)
    await waitFor(() => evaluate(`!!document.querySelector('table')`))
    const qCountBefore = await evaluate(`document.querySelectorAll('tbody tr').length`)

    await clickButtonByText(reSrc('admin', 'questions', 'new'))
    await waitFor(() => evaluate(`!!document.querySelector('form')`))

    // Switch the question type select to open_text (React-friendly event)
    const switched = await evaluate(`(() => {
      const typeSel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'open_text'))
      if (!typeSel) return false
      typeSel.selectedIndex = [...typeSel.options].findIndex(o => o.value === 'open_text')
      const evt = new Event('change', { bubbles: true, cancelable: true })
      Object.defineProperty(evt, 'target', { value: typeSel })
      typeSel.dispatchEvent(evt)
      return true
    })()`)
    await new Promise((r) => setTimeout(r, 600))
    check('question type switchable to Open Text', switched)

    const addBtnPattern = reSrc('admin', 'questions', 'addAnswerField')
    const removeBtnPattern = reSrc('admin', 'questions', 'removeAnswerField')
    const countFieldsExpr = `(() => {
      const btns = [...document.querySelectorAll('button')]
      return btns.filter(b => new RegExp(${JSON.stringify(removeBtnPattern)}).test(b.textContent || '')).length
    })()`

    // Add 2 more fields (starts with 1 → 3 total)
    await clickButtonByText(addBtnPattern)
    await clickButtonByText(addBtnPattern)
    const fieldCount = await evaluate(countFieldsExpr)
    check('add answer field works (3 fields present)', fieldCount >= 3, `fields=${fieldCount}`)

    // Remove one field → window.confirm must be shown before deletion
    await evaluate(`(() => { window.__confirmCalls = 0; window.confirm = () => { window.__confirmCalls++; return true } })()`)
    const removeClicked = await evaluate(`(() => {
      const btn = [...document.querySelectorAll('button')].find(b => new RegExp(${JSON.stringify(removeBtnPattern)}).test(b.textContent || ''))
      if (!btn) return false
      btn.click()
      return true
    })()`)
    await new Promise((r) => setTimeout(r, 500))
    const confirmCalls = await evaluate(`window.__confirmCalls || 0`)
    const fieldCountAfterRemove = await evaluate(countFieldsExpr)
    check('remove answer field asks for confirmation', removeClicked && confirmCalls >= 1, `confirmCalls=${confirmCalls}`)
    check('remove answer field actually removes a field', fieldCountAfterRemove === fieldCount - 1, `${fieldCount} -> ${fieldCountAfterRemove}`)

    // Select the first course (course select is the one whose options are courses)
    await evaluate(`(() => {
      const selects = [...document.querySelectorAll('select')]
      // the course select has options with documentId-like values, not fixed enums
      const courseSel = selects.find(s => [...s.options].some(o => o.value && o.value !== 'open_text' && o.value !== 'multiple_choice' && o.value !== 'yes_no' && o.value !== 'single_choice' && o.value !== 'aka_ao' && o.value.length > 8))
      if (!courseSel) return false
      const idx = [...courseSel.options].findIndex(o => o.value !== '')
      if (idx < 0) return false
      courseSel.selectedIndex = idx
      const evt = new Event('change', { bubbles: true, cancelable: true })
      Object.defineProperty(evt, 'target', { value: courseSel })
      courseSel.dispatchEvent(evt)
      return courseSel.value
    })()`)
    await new Promise((r) => setTimeout(r, 600))

    // Fill question text (the first textarea labelled with the question text key)
    await evaluate(`(() => {
      const labels = [...document.querySelectorAll('label')].filter(l => new RegExp(${JSON.stringify(reSrc('admin', 'questions', 'textLabel'))}).test(l.textContent || ''))
      const labelEl = labels.find(l => l.htmlFor) || labels[0]
      if (!labelEl) return false
      const input = document.getElementById(labelEl.htmlFor) || labelEl.closest('div')?.querySelector('textarea, input')
      if (!input) return false
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
        || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(input, 'UI E2E: list 3 criteria')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    })()`)
    await new Promise((r) => setTimeout(r, 300))

    // Save the question
    await evaluate(`(() => {
      const form = document.querySelector('form')
      const btn = [...form.querySelectorAll('button')].find(b => new RegExp(${JSON.stringify(reSrc('admin', 'questions', 'createBtn'))}).test(b.textContent || ''))
      if (btn) btn.click()
      return !!btn
    })()`)
    await new Promise((r) => setTimeout(r, 2500))
    const qCountAfter = await evaluate(`document.querySelectorAll('tbody tr').length`)
    check('open-text question created via UI', qCountAfter > qCountBefore, `${qCountBefore} -> ${qCountAfter}`)

    // 4 ── admin results page renders ──────────────────────────────────────
    await navigate(`${FRONTEND}/admin/results`)
    await waitFor(() => evaluate(`document.body.textContent.includes(${JSON.stringify(alt('admin', 'results', 'title')[0])}) || document.querySelector('h1')`))
    check('admin results page renders', await evaluate(`!!document.querySelector('h1')`))

    // 5 ── student dashboard renders ───────────────────────────────────────
    await navigate(`${FRONTEND}/dashboard`)
    await waitFor(() => evaluate(`document.body.textContent.length > 200`))
    check('student dashboard renders', await evaluate(`document.querySelector('h1, h2')?.textContent || ''`))

    // ── console errors ────────────────────────────────────────────────────
    const relevantErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('DevTools') && !e.includes('ResizeObserver'),
    )
    check('no console errors on visited pages', relevantErrors.length === 0, relevantErrors.slice(0, 3).join(' | '))

    const passed = results.filter((r) => r.ok).length
    const failed = results.filter((r) => !r.ok).length
    console.log(`\n== UI verification: ${passed} passed, ${failed} failed ==\n`)
    process.exit(failed > 0 ? 1 : 0)
  } catch (err) {
    console.error('\nUI verification crashed:', err.message)
    process.exit(1)
  } finally {
    try { ws?.close() } catch {}
  }
}

main()