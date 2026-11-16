# 深夜放映室

我的私人觀影手記。每部電影是一份 markdown 手記，記下那天在哪裡、跟誰、吃什麼、邊看邊想到什麼；網站自動把它排成電影票根風格的頁面，作品之間用 `[[slug]]` 互相連結。

規則全部寫在 [`CLAUDE.md`](./CLAUDE.md)，讓 AI 可以照同一套方式持續新增作品。

## 新增一部作品

1. 複製 `raw/_template.md` 成 `raw/<slug>.md`，把看片時的現場、碎碎念、感想、分數寫進去（手機備忘錄直接貼也可以）。
2. 開新對話，跟 AI 說：

> 請先讀 CLAUDE.md。我的原始筆記在 raw/xxx.md，請依 SOP 整理成手記：不要加入我沒寫的內容，缺的資料一次問我，完成後跑 check.py，並告訴我改了哪些檔案、哪些內容被移到劇透區。

AI 會查證年份片長、登記 `data/works.json`、把筆記整理進 `works/<slug>.md`、補上相關作品的雙向連結，並跑完檢查。

## 本機預覽

```bash
python3 -m http.server 8000
# 打開 http://localhost:8000
```

網站用 `fetch` 讀取 json 與 markdown，直接雙擊 html 打開會讀不到資料。

## 技術

- 純 HTML / CSS / JavaScript，免建置，GitHub Pages 直接發布
- markdown 轉換：[marked](https://github.com/markedjs/marked)（MIT，已放在 `assets/vendor/`）
