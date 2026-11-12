"""zwischenablage — API unter /api/plugins/zwischenablage/.

GET /clip liefert die Zwischenablage des Bot Screens, den gerade ein Mensch steuert (Lease
`human`): was der Agent allein kopiert, verlaesst die VM nicht. Gesucht wird ueber alle
Profile desselben Nutzers — die Desktop-App schickt die Anfrage an das Profil, das sie gerade
als Ziel fuehrt, und das muss nicht das Profil des Bot Screens sein.
Der Weg hinein braucht keine API — die Desktop-App schickt den Text per ClientCutText.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter

router = APIRouter()
_HELPER = Path(__file__).with_name("clip_get.py")
_MAX = 256 * 1024


def _home() -> Path:
    try:
        from hermes_constants import get_hermes_home
        return Path(get_hermes_home())
    except Exception:
        return Path(os.environ.get("HERMES_HOME") or Path.home() / ".hermes")


def _screens() -> list[Path]:
    """bot-desktop-Ordner aller Profile: Default-Home und profiles/*."""
    home = _home()
    root = home.parent.parent if home.parent.name == "profiles" else home
    dirs = [root / "bot-desktop", *sorted((root / "profiles").glob("*/bot-desktop"))]
    return [d for d in dirs if d.is_dir()]


def _lease(bd: Path) -> dict:
    try:
        data = json.loads((bd / "lease.json").read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _bot_env(bd: Path) -> dict | None:
    try:
        lines = (bd / "env").read_text(encoding="utf-8").splitlines()
    except OSError:
        return None
    env = dict(os.environ)
    for line in lines:
        k, sep, v = line.partition("=")
        if sep and k in ("DISPLAY", "XAUTHORITY"):
            env[k] = v
    return env if "DISPLAY" in env else None


@router.get("/clip")
def clip():
    # Der Screen, den zuletzt ein Mensch uebernommen hat
    held = [(float(_lease(bd).get("since") or 0), bd) for bd in _screens() if _lease(bd).get("holder") == "human"]
    if not held:
        return {"ok": False, "grund": "agent-steuert"}
    bd = max(held)[1]
    env = _bot_env(bd)
    if env is None:
        return {"ok": False, "grund": "kein-screen"}
    try:
        out = subprocess.run([sys.executable, str(_HELPER)], env=env, capture_output=True, timeout=4).stdout
    except subprocess.TimeoutExpired:
        return {"ok": False, "grund": "timeout"}
    text = out.decode("utf-8", "replace")
    if not text or len(text) > _MAX:
        return {"ok": False, "grund": "leer" if not text else "zu-gross"}
    return {"ok": True, "text": text}
