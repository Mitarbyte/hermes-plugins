"""Gibt die X-Zwischenablage des Bot Screens auf stdout aus (CLIPBOARD, sonst leer).

Laeuft als eigener Prozess mit DISPLAY/XAUTHORITY des Bot Screens: Tk darf nicht im
Dashboard-Prozess laufen (eigene Event-Schleife, haengt am X-Server).
"""
import sys
import tkinter as tk

r = tk.Tk()
r.withdraw()
text = ""
for typ in ("UTF8_STRING", "STRING"):
    try:
        text = r.selection_get(selection="CLIPBOARD", type=typ)
        break
    except Exception:
        continue
r.destroy()
sys.stdout.buffer.write(text.encode("utf-8"))
