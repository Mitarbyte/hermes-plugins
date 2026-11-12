# zwischenablage

Strg+C auf deinem Rechner, Strg+V im Bot Screen – und umgekehrt.

## Warum

Die Desktop-App gibt die Zwischenablage nicht an den Bot Screen weiter:

- **Rein:** Der Bildschirm-Viewer (noVNC) fängt Strg+V ab, bevor der Browser das `paste`-Event auslöst.
  Die App schickt deinen Text deshalb nie, im Bot Screen landet der alte Inhalt.
- **Raus:** Der Bot Screen schickt seine Zwischenablage absichtlich an niemanden (`-SendCutText=0`),
  damit Zuschauer nicht mitlesen.

## Wie

- **Rein** (nur Desktop-App): Das Plugin hält Strg+V kurz vor noVNC an. Der Browser löst `paste` aus,
  die App schickt deinen Text selbst – nur wenn du den Bot Screen steuerst. Danach reicht das Plugin
  Strg+V an den Bot Screen weiter.
- **Raus:** Nach Strg+C/Strg+X im Bot Screen holt das Plugin den Text über `GET /api/plugins/zwischenablage/clip`
  und legt ihn in die Zwischenablage deines Rechners. Die API gibt ihn nur heraus, solange ein Mensch den
  Bot Screen steuert; was der Agent allein kopiert, bleibt im Bot Screen.

Nur Text, bis 256 KiB.

## Teile

| Ordner | Läuft | Aufgabe |
|---|---|---|
| `desktop/plugin.js` | Desktop-App auf deinem Rechner | Strg+V durchreichen, Text in deine Zwischenablage legen |
| `dashboard/plugin_api.py`, `clip_get.py` | Hermes auf dem Rechner mit dem Bot Screen (Linux) | Zwischenablage des Bot Screens lesen |

Beide Teile werden gebraucht. Ist die App mit einem entfernten Hermes verbunden, installierst du den
Desktop-Teil in der App und den Rest auf dem entfernten Rechner (siehe [README](../README.md)).

## Voraussetzungen

- Hermes mit Bot Screen (Linux, Xvnc)
- Python von Hermes mit `tkinter`
