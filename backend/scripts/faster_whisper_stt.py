#!/usr/bin/env python3
"""
Local STT via faster-whisper (CTranslate2). No OpenAI API, no account — runs on your machine.

Usage:
  python faster_whisper_stt.py <audio_path> [model_size] [language]

language: ISO code (e.g. ar, en) or "auto" for detection.

Env:
  WHISPER_FASTER_DEVICE   cpu | cuda (default cpu)
  WHISPER_FASTER_COMPUTE  int8 | int8_float16 | float16 | float32 (default int8 on cpu)
"""
from __future__ import annotations

import json
import os
import sys


def main() -> None:
    if len(sys.argv) < 2:
        print(
            json.dumps(
                {
                    "error": "usage: faster_whisper_stt.py <audio_path> [model_size] [language]",
                }
            )
        )
        sys.exit(2)

    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "small"
    lang_arg = sys.argv[3] if len(sys.argv) > 3 else "auto"

    if not os.path.isfile(audio_path):
        print(json.dumps({"error": f"file not found: {audio_path}"}))
        sys.exit(2)

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(
            json.dumps(
                {
                    "error": "faster-whisper not installed. Run: pip install faster-whisper",
                }
            )
        )
        sys.exit(1)

    device = os.environ.get("WHISPER_FASTER_DEVICE", "cpu").strip() or "cpu"
    compute_type = os.environ.get("WHISPER_FASTER_COMPUTE", "").strip()
    if not compute_type:
        compute_type = "int8" if device == "cpu" else "float16"

    try:
        model = WhisperModel(model_size, device=device, compute_type=compute_type)
    except Exception as e:
        print(json.dumps({"error": f"WhisperModel load failed: {e!s}"}))
        sys.exit(1)

    transcribe_kw = {"beam_size": 5}
    if lang_arg and lang_arg.lower() not in ("auto", "none", ""):
        transcribe_kw["language"] = lang_arg.lower()

    try:
        segments, info = model.transcribe(audio_path, **transcribe_kw)
        parts = []
        for seg in segments:
            parts.append(seg.text)
        text = "".join(parts).strip()
    except Exception as e:
        print(json.dumps({"error": f"transcribe failed: {e!s}"}))
        sys.exit(1)

    out_lang = getattr(info, "language", None) or ""
    duration = float(getattr(info, "duration", 0) or 0)
    print(json.dumps({"text": text, "language": out_lang, "duration": duration}))


if __name__ == "__main__":
    main()
