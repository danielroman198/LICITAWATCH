#!/bin/bash
cd "$(dirname "$0")/logs" 2>/dev/null || exit 0
for p in *.pid; do [ -f "$p" ] && kill "$(cat "$p")" 2>/dev/null && echo "Detenido ${p%.pid}"; rm -f "$p"; done
