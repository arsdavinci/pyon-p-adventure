#!/usr/bin/env bash
# できた声（assets/voice/）だけをコミットしてプッシュする。ほかの変更にはさわらない。
# 使い方：bash tools/voice_publish.sh        … 1回だけ
#         bash tools/voice_publish.sh loop   … 生成が動いているあいだ、15分ごとに
cd "$(dirname "$0")/.." || exit 1
STATUS="D:/Development/02_App/AfurecoBooth/data/batch_status.json"

publish() {
  git add -- assets/voice
  if git diff --cached --quiet -- assets/voice; then return; fi
  n=$(git -c core.quotepath=off diff --cached --name-only -- assets/voice | grep -c '\.mp3$')
  git commit -q -m "Voices: add ${n} more voiced lines" -- assets/voice || return
  git pull -q --rebase --autostash && git push -q && echo "$(date +%T) pushed ${n} mp3"
}

publish
if [ "$1" = "loop" ]; then
  while grep -q '"state": "running"' "$STATUS" 2>/dev/null; do
    sleep 900
    publish
  done
  publish
  echo "$(date +%T) generation finished; final publish done"
fi
