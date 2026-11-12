// Zwischenablage Bot Screen — Desktop-App-Teil.
//
// Rein: noVNC schluckt das keydown von Strg+V (preventDefault), deshalb feuert das native
// paste-Event nie und die App schickt deinen Text nicht. Wir halten das keydown vor noVNC an,
// lassen den Browser sein paste-Event feuern (die App schickt den Text dann selbst als
// ClientCutText, nur wenn du steuerst) und reichen Strg+V danach an noVNC weiter.
// Raus: nach Strg+C/X im Bot Screen holt das Plugin den Text von der VM-API (/clip,
// nur wenn ein Mensch steuert) und legt ihn in die Zwischenablage deines Rechners.
// Mac: Cmd+C/V/X kaeme im Bot Screen (Linux) als Alt+… an. Das Plugin uebersetzt sie in
// Strg+C/V/X: Cmd im Bot Screen loslassen, Strg+Taste senden.
const SCREEN = '[data-remote-screen]'
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')

const inScreen = el => Boolean(el && typeof el.closest === 'function' && el.closest(SCREEN))
// Die Kopier-/Einfuege-Taste der Plattform: Cmd am Mac, Strg sonst
const isClipMod = e => !e.altKey && (IS_MAC ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey)

const key = (target, type, init) =>
  target.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init }))

export default {
  id: 'zwischenablage',
  name: 'Zwischenablage Bot Screen',
  register(ctx) {
    let forwarding = false
    let pending = null
    let lastOut = null

    // Strg+<Taste> an noVNC geben. Unter Windows/Linux ist Strg schon gedrueckt (noVNC hat es
    // gesehen); am Mac zuerst Cmd im Bot Screen loesen und Strg selbst druecken.
    const sendCtrl = (target, k) => {
      forwarding = true
      try {
        if (IS_MAC) {
          for (const code of ['MetaLeft', 'MetaRight']) key(target, 'keyup', { key: 'Meta', code })
          key(target, 'keydown', { key: 'Control', code: 'ControlLeft', ctrlKey: true })
        }
        key(target, 'keydown', { key: k.key, code: k.code, ctrlKey: true, shiftKey: k.shiftKey })
        key(target, 'keyup', { key: k.key, code: k.code, ctrlKey: true, shiftKey: k.shiftKey })
        if (IS_MAC) key(target, 'keyup', { key: 'Control', code: 'ControlLeft' })
      } finally {
        forwarding = false
      }
    }

    const forward = () => {
      const p = pending
      pending = null
      if (p) sendCtrl(p.target, p)
    }

    // explicit = nach Strg+C/X: immer schreiben (derselbe Text kann erneut kopiert werden, auch
    // aus einem anderen Profil). Beim Verlassen des Screens nur, wenn sich im Bot Screen etwas
    // geaendert hat — sonst ueberschriebe jedes Rausfahren mit der Maus die PC-Zwischenablage.
    const pull = async (explicit = false) => {
      try {
        const r = await ctx.rest('/clip')
        if (r && r.ok && typeof r.text === 'string' && (explicit || r.text !== lastOut)) {
          lastOut = r.text
          await ctx.os.writeClipboard(r.text)
        }
      } catch {
        // API aus oder Screen weg: still bleiben
      }
    }

    ctx.addEventListener(window, 'keydown', e => {
      if (forwarding || !inScreen(e.target) || !isClipMod(e)) return
      const k = { target: e.target, key: e.key.toLowerCase(), code: e.code, shiftKey: e.shiftKey }
      if (e.code === 'KeyV') {
        // noVNC darf dieses keydown nicht sehen, sonst kein paste-Event
        e.stopImmediatePropagation()
        pending = k
        // Kam kein paste-Event (leere/Nicht-Text-Zwischenablage), Taste trotzdem durchreichen
        ctx.setTimeout(forward, 250)
      } else if (e.code === 'KeyC' || e.code === 'KeyX') {
        if (IS_MAC) {
          // Cmd+C nicht als Alt+C ankommen lassen, sondern als Strg+C
          e.stopImmediatePropagation()
          e.preventDefault()
          sendCtrl(e.target, k)
        }
        ctx.setTimeout(() => pull(true), 400)
        ctx.setTimeout(() => pull(true), 1200)
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
