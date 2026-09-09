// debug-form2.mjs — check if React picks up change events on the type select
const PORT = Number(process.env.CDP_PORT || 9242)
let ws, msgId = 0
const pending = new Map()

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++msgId
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})

const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) console.log('EVAL-ERR:', r.exceptionDetails.exception?.description?.slice(0, 300))
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
  await ev(`(() => {
    const els = [...document.querySelectorAll('button, a, [role="button"]')]
    const el = els.find(e => /(New Question|Jauns jaut|Новый вопр)/.test((e.textContent || '').trim()))
    if (el) el.click()
  })()`)
  await new Promise((r) => setTimeout(r, 1500))

  // Instrument: count native change events on the select + check React internals
  const info = await ev(`(() => {
    const typeSel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'open_text'))
    if (!typeSel) return { error: 'no select found' }
    window.__changeCount = 0
    typeSel.addEventListener('change', () => { window.__changeCount++ }, true)
    // React 19: look for the root's internal props
    const root = document.getElementById('root')
    return {
      selectFound: true,
      options: [...typeSel.options].map(o => o.value),
      reactKey: Object.keys(root || {}).find(k => k.startsWith('__react')),
    }
  })()`)
  console.log('info:', JSON.stringify(info))

  // Fire change with full event init
  await ev(`(() => {
    const typeSel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'open_text'))
    typeSel.selectedIndex = [...typeSel.options].findIndex(o => o.value === 'open_text')
    const evt = new Event('change', { bubbles: true, cancelable: true })
    Object.defineProperty(evt, 'target', { value: typeSel })
    typeSel.dispatchEvent(evt)
  })()`)
  await new Promise((r) => setTimeout(r, 1000))
  console.log('change events seen:', await ev(`window.__changeCount`))
  console.log('open text panel:', await ev(`document.body.textContent.includes('Number of answers') || document.body.textContent.includes('Atbilžu lauku') || document.body.textContent.includes('Количество ответов')`))
  console.log('select DOM value:', await ev(`(() => { const s = [...document.querySelectorAll('select')].find(s2 => [...s2.options].some(o => o.value === 'open_text')); return s.value })()`))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })