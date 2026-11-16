# 深夜放映室

我的私人觀影手記。每部電影是一份 markdown 手記，記下那天在哪裡、跟誰、吃什麼、邊看邊想到什麼；網站自動把它排成電影票根風格的頁面，作品之間用 `[[slug]]` 互相連結。

規則全部寫在 [`CLAUDE.md`](./CLAUDE.md)，讓 AI 可以照同一套方式持續新增作品。

## 新增一部作品

開新對話，跟 AI 說：

> 請先讀 CLAUDE.md。我昨晚 11 點在宿舍跟室友看了《XXX》，配鹹酥雞。感想是……，分數：劇情 4、角色 5、畫面 4、音樂 3、重看 3。請依 SOP 新增。

AI 會在 `data/works.json` 登記資料、建立 `works/<slug>.md`、補上相關作品的雙向連結，並跑完檢查清單。

## 本機預覽

```bash
python3 -m http.server 8000
# 打開 http://localhost:8000
```

網站用 `fetch` 讀取 json 與 markdown，直接雙擊 html 打開會讀不到資料。

## 技術

- 純 HTML / CSS / JavaScript，免建置，GitHub Pages 直接發布
- markdown 轉換：[marked](https://github.com/markedjs/marked)（MIT，已放在 `assets/vendor/`）
