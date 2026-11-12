// Zwischenablage Bot Screen — Desktop-App-Teil (Spike).
//
// Rein: noVNC schluckt das keydown von Strg+V (preventDefault), deshalb feuert das native
// paste-Event nie und die App schickt deinen Text nicht. Wir halten das keydown vor noVNC an,
// lassen den Browser sein paste-Event feuern (die App schickt den Text dann selbst als
// ClientCutText, nur wenn du steuerst) und reichen Strg+V danach an noVNC weiter.
// Raus: nach Strg+C/X im Bot Screen holt das Plugin den Text von der VM-API (/clip,
// nur wenn ein Mensch steuert) und legt ihn in die Zwischenablage deines Rechners.
const SCREEN = '[data-remote-screen]'

const inScreen = el => Boolean(el && typeof el.closest === 'function' && el.closest(SCREEN))
const isMod = e => (e.ctrlKey || e.metaKey) && !e.altKey

export default {
  id: 'zwischenablage',
  name: 'Zwischenablage Bot Screen',
  register(ctx) {
    let forwarding = false
    let pending = null
    let lastOut = null

    const forward = () => {
      const p = pending
      pending = null
      if (!p) return
      forwarding = true
      try {
        for (const type of ['keydown', 'keyup']) {
          p.target.dispatchEvent(new KeyboardEvent(type, {
            key: p.key, code: p.code, ctrlKey: p.ctrlKey, metaKey: p.metaKey, shiftKey: p.shiftKey,
            bubbles: true, cancelable: true
          }))
        }
      } finally {
        forwarding = false
      }
    }

    const pull = async () => {
      try {
        const r = await ctx.rest('/clip')
        if (r && r.ok && typeof r.text === 'string' && r.text !== lastOut) {
          lastOut = r.text
          await ctx.os.writeClipboard(r.text)
        }
      } catch {
        // API aus oder Screen weg: still bleiben
      }
    }

    ctx.addEventListener(window, 'keydown', e => {
      if (forwarding || !inScreen(e.target) || !isMod(e)) return
      if (e.code === 'KeyV') {
        // noVNC darf dieses keydown nicht sehen, sonst kein paste-Event
        e.stopImmediatePropagation()
        pending = { target: e.target, key: e.key, code: e.code, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey }
        // Kam kein paste-Event (leere/Nicht-Text-Zwischenablage), Taste trotzdem durchreichen
        ctx.setTimeout(forward, 250)
      } else if (e.code === 'KeyC' || e.code === 'KeyX') {
        ctx.setTimeout(pull, 400)
        ctx.setTimeout(pull, 1200)
      }
    }, true)

    // Bubble-Phase am window: laeuft NACH dem paste-Handler der App am Screen-Container,
    // d. h. der Text ist schon als ClientCutText unterwegs, bevor Strg+V folgt.
    ctx.addEventListener(window, 'paste', e => {
      if (pending && inScreen(e.target)) forward()
    }, false)

    // Kopieren per Kontextmenue im Bot Screen: beim Verlassen des Screens einmal nachsehen
    ctx.addEventListener(document, 'pointerout', e => {
      if (inScreen(e.target) && !inScreen(e.relatedTarget)) pull()
    }, true)
  }
}
