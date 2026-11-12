"""zwischenablage — API unter /api/plugins/zwischenablage/.

GET /clip liefert die Zwischenablage des Bot Screens, aber nur solange ein Mensch den
Screen steuert (Lease `human`): was der Agent allein kopiert, verlaesst die VM nicht.
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


def _holder(bd: Path) -> str:
    try:
        return json.loads((bd / "lease.json").read_text(encoding="utf-8")).get("holder") or "agent"
    except (OSError, ValueError):
        return "agent"


@router.get("/clip")
def clip():
    bd = _home() / "bot-desktop"
    if _holder(bd) != "human":
        return {"ok": False, "grund": "agent-steuert"}
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
