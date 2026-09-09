const PORT = Number(process.env.CDP_PORT || 9247)
let ws, msgId = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++msgId
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) console.log('EVAL-ERR:', r.exceptionDetails.exception?.description?.slice(0, 200))
  return r.result?.value
}
async function main() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json`)
      const list = await res.json()
      const target = list.find((t) => t.type === 'page')
      if (target) {
        ws = new WebSocket(target.webSocketDebuggerUrl)
        await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
        ws.onmessage = (e) => {
          const m = JSON.parse(e.data)
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
    const id = document.getElementById('email'); const pw = document.getElementById('password')
    setter.call(id, 'admin@gmail.com'); id.dispatchEvent(new Event('input', { bubbles: true }))
    setter.call(pw, 'Admin123'); pw.dispatchEvent(new Event('input', { bubbles: true }))
  })()`)
  await ev(`document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))`)
  await new Promise((r) => setTimeout(r, 3500))
  await ev(`location.href = 'http://localhost:5174/admin/results'`)
  await new Promise((r) => setTimeout(r, 6000))
  console.log('path:', await ev(`location.pathname`))
  console.log('body head:', await ev(`document.body.textContent.replace(/\\s+/g,' ').slice(0, 300)`))
  console.log('h1:', await ev(`document.querySelector('h1')?.textContent`))
  console.log('error boundary?', await ev(`document.body.textContent.includes('Something went wrong') || document.body.textContent.includes('error')`))
  process.exit(0)
}
main().catch((e) => { console.error(e.message); process.exit(1) })