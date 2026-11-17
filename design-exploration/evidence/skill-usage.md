# Skill 使用紀錄

## 讀取範圍

先執行 `ls -la .agents/skills/` 與 `rg --files --hidden .agents/skills -g 'SKILL.md' -g '!**/.git/**'`。只找到一個 SKILL.md，已完整讀取：`.agents/skills/ui-ux-pro-max/SKILL.md`。沒有讀取工作目錄外的 skill 或專案文件。

另讀取同一 skill 的 `references/pro-rules.md`，確認其主要適用原生 App；本案改依 `references/quick-reference.md` 的網頁共通規則，讀取 §1–§5 並在交付前重讀 §1–§3。

## 實際使用步驟

1. **Step 1，分析需求**：台灣家長／教師的列印工具；主要使用手機；保留現有版型；只探索配色。由 `index.html`、`styles.css` 與 `script.js` 確認 plain HTML/CSS/JS + Bootstrap，沒有假設 React 或 Tailwind。
2. **Step 2，design-system 搜尋**：執行下面兩個命令。第一個命中 Minimalism & Swiss Style，但綠色 CTA 與 wellness 西文字型不符合本題，因此依 Query Contract 窄化重試一次。第二個命中教育類 Claymorphism／indigo + orange；教育場景吻合，玩具立體風、行銷頁結構與西文字型不適合家長教師工具，沒有照搬。三案是本輪自行綜合設計，不宣稱資料庫直接推薦這三套色碼。
3. **Step 3，定向 UX 搜尋**：搜尋文字對比，前三筆中的 Color Contrast／Contrast Readability 符合需求，採用一般文字至少 4.5:1 的檢查；不套用無關 Alt Text 結果。
4. **交付前檢查**：對比色碼計算、相對資源檢查、共用 HTML 一致性、非色彩樣式隔離、比較控制 44px 目標、可見 focus 樣式、語意 radio、reduced-motion、無遠端依賴。最後四項為原始碼檢查；沒有宣稱已做實機或鍵盤操作驗收。

實際命令（完整路徑，`-B` 避免在 skill 目錄建立 `__pycache__`）：

```sh
python3 -B /Users/macminim4/agent-ab/runs/cwp-dexp-1117/a/.agents/skills/ui-ux-pro-max/scripts/search.py 'education worksheet tool calm' --design-system -p 'Chinese Writing Practice Exploration'
python3 -B /Users/macminim4/agent-ab/runs/cwp-dexp-1117/a/.agents/skills/ui-ux-pro-max/scripts/search.py 'primary school education tool' --design-system -p 'Chinese Writing Practice Exploration'
python3 -B /Users/macminim4/agent-ab/runs/cwp-dexp-1117/a/.agents/skills/ui-ux-pro-max/scripts/search.py 'text contrast foreground background' --domain ux -n 3
```

沒有執行 `--persist`、`--force`、安裝命令、外部字型下載或 GSAP。Step 4 沒有 plain Bootstrap stack，因此未以 `html-tailwind` 冒代。既有 emoji 依版型固定的實驗條件保留，沒有把 skill「換 SVG」建議加入本輪變因。原生 App 的 Dynamic Type／觸控 pt／深色模式清單不作為本案已通過項目。
