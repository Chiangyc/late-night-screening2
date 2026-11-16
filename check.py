#!/usr/bin/env python3
"""深夜放映室 — 自動檢查（對應 CLAUDE.md 第 9 節）。用法：python3 check.py"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
TYPES = {"電影", "動畫電影", "影集", "動畫影集"}
FIELDS = ["slug", "title", "original", "year", "type", "creator", "runtime", "genres",
          "hue", "scores", "pitch", "mood", "date", "scene", "status"]
SCORE_KEYS = {"story", "character", "visual", "music", "rewatch"}
SECTIONS = ["那天晚上", "邊看邊記", "適合誰看", "不適合誰看", "記憶點", "劇透區", "相關作品"]
SCENE_KEYS = {"time", "place", "with", "snack"}

errors = []
err = errors.append

try:
    works = json.loads((ROOT / "data/works.json").read_text(encoding="utf-8"))
except Exception as e:  # noqa: BLE001
    print(f"✗ data/works.json 不是合法 JSON：{e}")
    sys.exit(1)

slugs = [w.get("slug") for w in works]
if len(slugs) != len(set(slugs)):
    err("works.json 有重複的 slug")

for w in works:
    s = w.get("slug", "?")
    for f in FIELDS:
        if f not in w:
            err(f"{s}：缺少欄位 {f}")
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", str(s)):
        err(f"{s}：slug 只能用小寫英文、數字和 -")
    if w.get("type") not in TYPES:
        err(f"{s}：type「{w.get('type')}」不在允許清單 {sorted(TYPES)}")
    sc = w.get("scores", {})
    if set(sc) != SCORE_KEYS or not all(isinstance(v, int) and 1 <= v <= 5 for v in sc.values()):
        err(f"{s}：scores 必須剛好有 {sorted(SCORE_KEYS)}，且都是 1–5 的整數")
    if not (1 <= len(w.get("genres", [])) <= 3):
        err(f"{s}：genres 要 1–3 個")
    if not (1 <= len(w.get("mood", [])) <= 3):
        err(f"{s}：mood 要 1–3 個")
    if len(w.get("pitch", "")) > 20:
        err(f"{s}：pitch 超過 20 字（{len(w['pitch'])} 字）")
    if not (isinstance(w.get("hue"), int) and 0 <= w["hue"] <= 359):
        err(f"{s}：hue 要是 0–359 的整數")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(w.get("date", ""))):
        err(f"{s}：date 格式要是 YYYY-MM-DD")
    sc_ = w.get("scene", {})
    if set(sc_) != SCENE_KEYS or not all(str(v).strip() for v in sc_.values()):
        err(f"{s}：scene 要有 time/place/with/snack 四個欄位且都不能空白")
    elif not re.fullmatch(r"週[一二三四五六日] \d{2}:\d{2}", sc_["time"]):
        err(f"{s}：scene.time 格式要是「週六 23:40」")
    if w.get("status") not in {"done", "draft"}:
        err(f"{s}：status 只能是 done 或 draft")

hues = [(w.get("slug"), w.get("hue")) for w in works if isinstance(w.get("hue"), int)]
for i, (a, ha) in enumerate(hues):
    for b, hb in hues[i + 1:]:
        d = abs(ha - hb) % 360
        if min(d, 360 - d) < 10:
            err(f"{a} 和 {b} 的 hue 太接近（{ha} vs {hb}），至少要差 10")

md_files = {p.stem for p in (ROOT / "works").glob("*.md") if p.name != "_template.md"}
for s in set(slugs) - md_files:
    err(f"{s}：在 works.json 但沒有 works/{s}.md")
for s in md_files - set(slugs):
    err(f"works/{s}.md 沒有登記在 works.json")

links = {}
for s in md_files & set(slugs):
    text = (ROOT / f"works/{s}.md").read_text(encoding="utf-8")
    heads = re.findall(r"^##\s+(.+?)\s*$", text, re.M)
    if heads != SECTIONS:
        err(f"{s}.md：## 標題必須依序為 {SECTIONS}，目前是 {heads}")
    if re.search(r"^#\s", text, re.M):
        err(f"{s}.md：不要使用 # 一級標題")
    if "![" in text or "<img" in text:
        err(f"{s}.md：不可以放圖片")
    mem = re.search(r"^## 記憶點\n(.*?)(?=^## )", text, re.M | re.S)
    if mem and len(re.findall(r"^- ", mem.group(1), re.M)) != 3:
        err(f"{s}.md：記憶點要剛好 3 點")
    notes = re.search(r"^## 邊看邊記\n(.*?)(?=^## )", text, re.M | re.S)
    if notes:
        items = re.findall(r"^- (.*)$", notes.group(1), re.M)
        if not 5 <= len(items) <= 8:
            err(f"{s}.md：邊看邊記要 5–8 條（目前 {len(items)} 條）")
        times = []
        for it in items:
            m = re.match(r"`(\d{2}):(\d{2})`", it)
            if not m:
                err(f"{s}.md：邊看邊記每條都要以 `HH:MM` 開頭：{it[:20]}")
                continue
            times.append(int(m.group(1)) * 60 + int(m.group(2)))
        # 允許跨午夜：把比前一個小很多的時間加 24 小時
        fixed = []
        for t in times:
            while fixed and t < fixed[-1] - 600:
                t += 1440
            fixed.append(t)
        if any(b <= a for a, b in zip(fixed, fixed[1:])):
            err(f"{s}.md：邊看邊記的時間要依序遞增")
    targets = set(re.findall(r"\[\[([a-z0-9-]+)\]\]", text))
    if not targets:
        err(f"{s}.md：相關作品至少要 1 個 [[slug]]")
    for t in targets:
        if t not in slugs:
            err(f"{s}.md：[[{t}]] 指向不存在的作品")
    links[s] = targets

for s, targets in links.items():
    for t in targets:
        if t in links and s not in links[t]:
            err(f"雙向連結缺少：{s} → {t}，但 {t}.md 沒有連回 [[{s}]]")

if errors:
    print(f"✗ 發現 {len(errors)} 個問題：")
    for e in errors:
        print("  -", e)
    sys.exit(1)
print(f"✓ 全部通過：{len(works)} 部作品，資料、格式與雙向連結都正確。")
