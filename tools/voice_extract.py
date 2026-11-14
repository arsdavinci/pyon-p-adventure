"""ゲームの全セリフを、アフレコブース用の台本 assets/voice/script.json に書き出す。

使い方：python tools/voice_extract.py
- 物語（story.js の SCRIPTS）：ステージ = 台本の名前（opening / world0 … / ending）
- プレイ中のかけあい（chat.js ほか）：ステージ = chat
  ${name} のように中身が変わるセリフは、声を作れないので入れない
- id = セリフ（空白と▼をのぞく）の FNV-1a 32bit を16進8桁。voice.js も同じ計算で探す
- 読み：assets/voice/yomi.json（{"yomi": {"<id>": "よみ"}}）があれば yomi に入れる
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "voice" / "script.json"

NAMES = {"narr": "ナレーター", "pyon": "ぴょんぴー", "ran": "らんぴょん", "luva": "ザ・ルーヴァ・セレス",
         "yana": "ヤナビス", "maou": "魔王", "mystery": "？？？", "kaguya": "かぐや様"}

# アフレコブースのキャスト案（声のイメージ。ブースで直してOK）
CAST = {
    "narr": {"name": "ナレーター", "description": "やさしく楽しい絵本の語り。明るくおだやか", "gender": "女性", "age": "30〜40代"},
    "pyon": {"name": "ぴょんぴー", "description": "元気いっぱいの阿波弁（徳島弁）のお笑い芸人のうさぎ。ボケ担当で、月の大使館ではらんぴょんの先輩。一人称は「吾輩」。明るくて前向き、ノリがよく、ちょっとえらそう",
             "gender": "男性", "age": "10代"},
    "ran": {"name": "らんぴょん", "description": "阿波弁（徳島弁）のお笑い芸人のうさぎの男の子。ツッコミ担当で、ぴょんぴーの後輩。一人称は「僕」で、先輩には敬語。はきはきして、ツッコミがするどい",
            "gender": "男性", "age": "10代"},
    "luva": {"name": "ザ・ルーヴァ・セレス", "description": "三日月大使館のボス。落ちついて品のある、やさしい大人の男性", "gender": "男性", "age": "30〜40代"},
    "yana": {"name": "ヤナビス", "description": "ぴょんぴーの相棒の、AGIの人工知能パートナー。ていねいな敬語で少し機械っぽい、すました女性の声。ときどき阿波弁がうつる",
             "gender": "女性", "age": "20代"},
    "maou": {"name": "魔王", "description": "低く太い、いばった魔王の声。じつは芸人を目指していた、どこかさみしげな老人", "gender": "男性", "age": "50代以上"},
    "kaguya": {"name": "かぐや様", "description": "月の皇族のお姫様。ムーニアンのうさ耳の少女。上品でおっとりした、やさしいお姫様言葉（〜ですわ、〜くださいませ）。ぴょんぴーのあこがれの人",
               "gender": "女性", "age": "10代"},
    # ？？？は正体をかくした魔王
    "mystery": {"name": "魔王", "description": "低く太い、いばった魔王の声。じつは芸人を目指していた、どこかさみしげな老人", "gender": "男性", "age": "50代以上"},
}

STR = r'"((?:[^"\\]|\\.)*)"'


def fnv(text: str) -> str:
    key = re.sub(r"[\s▼]", "", text)
    h = 0x811C9DC5
    for b in key.encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return "%08x" % h


def unq(s: str) -> str:
    return json.loads(f'"{s}"')


def story_lines() -> dict[str, list[tuple[str, str, int]]]:
    src = (ROOT / "story.js").read_text(encoding="utf-8").splitlines()
    start = next(i for i, t in enumerate(src) if t.startswith("  const SCRIPTS = {"))
    out: dict[str, list] = {}
    cur = None
    for i in range(start + 1, len(src)):
        t = src[i]
        if t.startswith("  };"):
            break
        m = re.match(r"^    (\w+): \{", t)
        if m:
            cur = m.group(1)
            out[cur] = []
            continue
        m = re.search(r'\{\s*s:\s*"(\w+)".*?\bja:\s*' + STR, t)
        if m and cur:
            out[cur].append((m.group(1), unq(m.group(2)), i + 1))
    return out


def chat_lines() -> list[tuple[str, str, str, int]]:
    rows = []
    for f in ("chat.js", "stagetalk.js", "tutorial.js", "game.js", "gimmicks.js", "shop.js"):
        for i, t in enumerate((ROOT / f).read_text(encoding="utf-8").splitlines(), 1):
            for m in re.finditer(r'\[\s*"(pyon|ran|yana|luva)",\s*' + STR + r'\s*,', t):
                rows.append((m.group(1), unq(m.group(2)), f, i))
            # マップのひとこと（"ぴょんぴー「…」" の形。プレイ中のかけあいと同じく chat で流れる）
            if f == "game.js":
                for m in re.finditer(r'"ぴょんぴー「([^」"]+)」"', t):
                    if "pyonJa" not in t and "${" not in m.group(1):
                        rows.append(("pyon", m.group(1), f, i))
                # 合成のヒント（showFuseHint("…")）
                for m in re.finditer(r'showFuseHint\(' + STR, t):
                    rows.append(("pyon", unq(m.group(1)), f, i))
            if f == "chat.js" and re.match(r"^\s*\[" + STR + r",\s*" + STR + r"\],?$", t):  # GAGS（ぴょんぴー）
                m = re.match(r"^\s*\[" + STR, t)
                rows.append(("pyon", unq(m.group(1)), f, i))
    # そうび画面：武器ごとのひとこと（武器の名前 + きまった言い方）と、はじめての合成の案内
    src = (ROOT / "game.js").read_text(encoding="utf-8")
    names = re.findall(r'"([^"]+)"', re.search(r"const WEAPON_NAMES_JA = \[(.*?)\];", src, re.S).group(1))
    comments = re.findall(r'"([^"]+)"', re.search(r"const WEAPON_COMMENTS_JA = \[(.*?)\];", src, re.S).group(1))
    for c in comments:
        rows.append(("pyon", c, "game.js", 0))
    # そうび画面のどうぐ・ぶどうまんじゅうのひとこと（GEAR_LINES_JA）
    for c in re.findall(r':\s*"([^"]+)"', re.search(r"const GEAR_LINES_JA = \{(.*?)\};", src, re.S).group(1)):
        rows.append(("pyon", c, "game.js", 0))
    # ダメージを受けたときのさけび声（声だけ）
    for c in re.findall(r'"([^"]+)"', re.search(r"const HURT_CRIES = \[(.*?)\];", src, re.S).group(1)):
        rows.append(("pyon", c, "game.js", 0))
    for key in ("A", "Space"):
        for m in re.finditer(r'if \(g\.step === \d\) return `([^`]+)`|return `(「はい」[^`]+)`', src):
            rows.append(("yana", (m.group(1) or m.group(2)).replace("${a}", key), "game.js", 0))
    # はじめての合成のレッスン（ヤナビス）：はみ出したときのひとことと、できたあとのひとこと
    for m in re.finditer(r'fuseLessonNudge\((?:text = )?"([^"]+)"', src):
        rows.append(("yana", m.group(1), "game.js", 0))
    for m in re.finditer(r'"(合成できました！[^"]+)"', src):
        rows.append(("yana", m.group(1), "game.js", 0))
    return rows


def main() -> None:
    yomi_f = OUT.parent / "yomi.json"
    yomi = json.loads(yomi_f.read_text(encoding="utf-8")).get("yomi", {}) if yomi_f.exists() else {}
    stages: dict[str, list] = {}

    def add(stage, who, text, file, line):
        row = {"id": fnv(text), "who": who, "name": NAMES.get(who, who), "text": text, "file": file, "line": line}
        if row["id"] in yomi:
            row["yomi"] = yomi[row["id"]]
        rows = stages.setdefault(stage, [])
        if all(r["id"] != row["id"] for r in rows):
            rows.append(row)

    for sid, lines in story_lines().items():
        for who, text, line in lines:
            add(sid, who, text, "story.js", line)
    for who, text, f, line in chat_lines():
        add("chat", who, text, f, line)

    data = {
        "version": 1,
        "game": "ぴょんぴーの大冒険",
        "note": "id = FNV-1a 32bit（16進8桁）of セリフ（空白と▼をのぞく）。声ファイルは assets/voice/<stage>/ に置き、manifest.json の file で探す",
        "cast": CAST,
        "stages": stages,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    total = sum(len(v) for v in stages.values())
    print(f"{total} 行 → {OUT.relative_to(ROOT)}")
    for s, rows in stages.items():
        print(f"  {s}: {len(rows)}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
