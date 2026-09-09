// debug-form.mjs — inspect the admin question form after switching type to open_text
const PORT = Number(process.env.CDP_PORT || 9239)
let ws, msgId = 0
const pending = new Map()

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++msgId
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})

const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) console.log('EVAL-ERR:', r.exceptionDetails.text)
  return r.result?.value
}

async function main() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`)
      const list = await res.json()
      const target = list.find((t) => t.type === 'page')
      if (target) {
        ws = new WebSocket(target.webSocketDebuggerUrl)
        await new Promise((res2, rej2) => { ws.onopen = res2; ws.onerror = rej2 })
        ws.onmessage = (e2) => {
          const m = JSON.parse(e2.data)
          if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result); pending.delete(m.id) }
        }
        break
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 300))
  }
  if (!ws) throw new Error('no CDP')

  // login
  await ev(`location.href = 'http://localhost:5174/login'`)
  await new Promise((r) => setTimeout(r, 3000))
  await ev(`(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    const id = document.getElementById('email')
    const pw = document.getElementById('password')
    setter.call(id, 'admin@gmail.com'); id.dispatchEvent(new Event('input', { bubbles: true }))
    setter.call(pw, 'Admin123'); pw.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await ev(`document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))`)
  await new Promise((r) => setTimeout(r, 3500))

  await ev(`location.href = 'http://localhost:5174/admin/questions'`)
  await new Promise((r) => setTimeout(r, 4000))
  console.log('path:', await ev(`location.pathname`))
  console.log('table rows:', await ev(`document.querySelectorAll('tbody tr').length`))
  await ev(`(() => {
    const els = [...document.querySelectorAll('button, a, [role="button"]')]
    const el = els.find(e => /(New Question|Jauns jaut|Новый вопр)/.test((e.textContent || '').trim()))
    if (el) el.click()
  })()`)
  await new Promise((r) => setTimeout(r, 1500))

  // try approach A: set selectedIndex + dispatch change
  const a = await ev(`(() => {
    const typeSel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'open_text'))
    if (!typeSel) return 'no select'
    typeSel.selectedIndex = [...typeSel.options].findIndex(o => o.value === 'open_text')
    typeSel.dispatchEvent(new Event('change', { bubbles: true }))
    return typeSel.value
  })()`)
  await new Promise((r) => setTimeout(r, 1000))
  console.log('approach A select value:', a, '| panel:', await ev(`document.body.textContent.includes('answer field') && document.body.textContent.includes('Number of answers')`))
  console.log('add-field buttons:', await ev(`[...document.querySelectorAll('button')].filter(b => /(Add answer field|Pievienot atbildes lauku|Добавить поле ответа)/.test(b.textContent || '')).length`))

  // try approach B: real keys
  await ev(`(() => {
    const typeSel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'open_text'))
    if (typeSel) typeSel.focus()
  })()`)
  for (const k of ['ArrowDown','ArrowDown','ArrowDown','Enter']) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k === 'Enter' ? 'Enter' : 'ArrowDown' })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k === 'Enter' ? 'Enter' : 'ArrowDown' })
    await new Promise((r) => setTimeout(r, 200))
  }
  await new Promise((r) => setTimeout(r, 1000))
  console.log('after keys, add-field buttons:', await ev(`[...document.querySelectorAll('button')].filter(b => /(Add answer field|Pievienot atbildes lauku|Добавить поле ответа)/.test(b.textContent || '')).length`))
  console.log('select value now:', await ev(`(() => { const s = [...document.querySelectorAll('select')].find(s2 => [...s2.options].some(o => o.value === 'open_text')); return s ? s.value : 'none' })()`))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })