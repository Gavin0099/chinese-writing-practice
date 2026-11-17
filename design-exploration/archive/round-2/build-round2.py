"""Build Round 2 only. Frozen Round 1 files are read, never regenerated.

Run from the repository root: python3 -B design-exploration/build-round2.py
Uses only the Python standard library and files in this directory.
"""
from pathlib import Path
import json
import re
import shutil

ROOT = Path(__file__).resolve().parent
HISTORY = ROOT / 'round-1'
METRICS = ('body-font', 'heading-font', 'label-font', 'heading-weight',
           'entry-weight', 'label-weight', 'heading-tracking')


def ratio(foreground, background):
    def luminance(color):
        channels = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
                  for v in channels]
        return sum(v * w for v, w in zip(linear, (.2126, .7152, .0722)))
    light, dark = sorted((luminance(foreground), luminance(background)), reverse=True)
    return (light + .05) / (dark + .05)


PAIRS = [
    ('正文／頁底', 'text', 'page'), ('入口標題／頁底', 'entry-text', 'page'),
    ('入口說明／頁底', 'description', 'page'), ('導覽／頁底', 'nav', 'page'),
    ('品牌／頁底', 'muted', 'page'), ('課名／卡片', 'title', 'surface'),
    ('年級／卡片', 'card-muted', 'surface'), ('提示／卡片', 'hint', 'surface'),
    ('詞庫按鈕文字', 'on-primary', 'primary'), ('詞庫 hover 文字', 'on-primary', 'primary-hover'),
    ('練習紙按鈕文字', 'on-secondary', 'secondary'), ('練習紙 hover 文字', 'on-secondary', 'secondary-hover'),
    ('署名／頁尾', 'credit', 'footer-bg'), ('來源連結／頁尾', 'credit-link', 'footer-bg'),
    ('授權標籤文字', 'badge-text', 'badge-bg'), ('回饋按鈕文字', 'on-feedback', 'feedback'),
    ('作者說明／卡片', 'card-muted', 'surface'), ('作者標題／卡片', 'title', 'surface'),
    ('回饋提示／卡片', 'card-muted', 'surface'), ('版權／頁尾', 'credit', 'footer-bg'),
]


def measure(d):
    rows = []
    for label, foreground, background in PAIRS:
        fg, bg = d['tokens'][foreground], d['tokens'][background]
        value = ratio(fg, bg)
        rows.append(dict(pair=label, foreground=fg, background=[bg],
                         ratio=round(value, 3), meets_4_5=value >= 4.5))
    return rows


def swatches(d):
    colors = [d['tokens'][k] for k in ('page', 'surface', 'text', 'primary', 'secondary')]
    return '<span class="swatches" aria-hidden="true">' + ''.join(
        f'<i style="--swatch:{c}"></i>' for c in colors) + '</span>'


def index(d):
    return f'<a class="index-link" href="#{d["slug"]}">{swatches(d)}<span class="index-label"><b>{d["id"]}</b>{d["name"]}</span></a>'


def card(d):
    rows = {r['pair']: r['ratio'] for r in d['contrast']['pairs']}
    parent = ' + '.join(d['parents'])
    return f'''<article class="direction" id="{d['slug']}">
<div class="card-caption"><div class="card-topline"><span class="direction-id">{d['id']}</span><span class="tag">{d['tag']}</span></div><h3>{d['name']}</h3><p class="parentline">{d['id']}（源自 {parent}）</p><p class="why">{d['why']}</p></div>
<div class="preview-label"><span>同版面・固定示範內容</span><span class="viewport-size">390 px · 等比例縮圖</span></div>
<div class="preview-window" style="--preview-bg:{d['tokens']['page']}"><iframe src="{d['slug']}.html" title="{d['id']} {d['name']} 首頁視覺示意" sandbox="allow-same-origin" tabindex="-1" scrolling="no"></iframe></div>
<div class="card-detail"><p class="difference"><b>與其他 R2 最大差別</b>　{d['diff']}<br><b>取捨</b>　{d['tradeoff']}<br><b>字體</b>　{d['type']}</p>{swatches(d)}
<p class="contrast">詞庫按鈕 {rows['詞庫按鈕文字']:.3f}:1／練習紙按鈕 {rows['練習紙按鈕文字']:.3f}:1<br>20 組文字配對最低 {d['contrast']['minimum']:.3f}:1；皆 ≥ 4.5:1<br>僅 sRGB 色票計算，非完整無障礙驗收。</p>
<a class="full-size" href="{d['slug']}.html" target="_blank" rel="noopener">原尺寸查看 · 含完整頁尾 <span aria-hidden="true">↗</span></a></div></article>'''


def render():
    old = json.loads((HISTORY / 'directions.json').read_text())
    new = json.loads((ROOT / 'round2-directions.json').read_text())
    baseline = old[0]['tokens']
    frozen_board = (HISTORY / 'comparison.html').read_text()
    old_cards = re.findall(r'<article class="direction".*?</article>', frozen_board, re.S)
    assert len(old_cards) == 7 and len(new) == 5
    styles = ['/* Round 2 only: colors and paint. All layout CSS and text metrics remain R0. */']
    for d in new:
        assert all(d['tokens'][k] == baseline[k] for k in METRICS), d['id']
        rows = measure(d)
        assert all(row['meets_4_5'] for row in rows), (d['id'], rows)
        d['contrast'] = dict(method='sRGB linearization; (L1 + .05) / (L2 + .05)',
                             minimum=min(row['ratio'] for row in rows), pairs=rows)
        # Copy an actual parent first. Only R2 targets are ever written.
        parent = next(p for p in old if p['slug'] + '.html' == d['copied_from'])
        target = ROOT / (d['slug'] + '.html')
        shutil.copyfile(HISTORY / d['copied_from'], target)
        page = target.read_text()
        page = page.replace(parent['slug'], d['slug']).replace('href="themes.css"', 'href="themes-round2.css"')
        page = page.replace(parent['id'] + ' ' + parent['name'], d['id'] + ' ' + d['name'])
        target.write_text(page)
        styles.append(f'body.{d["slug"]} {{\n' + '\n'.join(
            f'  --{key}: {value};' for key, value in d['tokens'].items()) + '\n}')
        # Separate card text color permits a dark surface without changing any metrics.
        styles.append(f'body.{d["slug"]} .hero-subtitle, body.{d["slug"]} .author-text p, body.{d["slug"]} .feedback-hint {{ color: var(--card-muted); }}')
    original_theme = (HISTORY / 'themes.css').read_text()
    styles.append(original_theme[original_theme.index('.study-disclaimer {'):].strip())
    (ROOT / 'themes-round2.css').write_text('\n\n'.join(styles) + '\n')
    (ROOT / 'directions.json').write_text(json.dumps(old + new, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'contrast-round2.json').write_text(json.dumps({
        'method': 'sRGB linearization; (lighter + 0.05) / (darker + 0.05)',
        'scope': '20 specified text pairs each; opaque colors; no emoji, antialiasing, borders or focus audit',
        'directions': {d['id']: d['contrast']['pairs'] for d in new}}, ensure_ascii=False, indent=2) + '\n')
    intro = '''<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>首頁視覺探索 Round 2｜生字練習簿小幫手</title>
<link rel="stylesheet" href="comparison.css"><link rel="stylesheet" href="comparison-round2.css"><script src="comparison-round2.js" defer></script></head>
<body><a class="skip" href="#directions">跳至方向比較</a>
<header class="page-header">
<div class="masthead"><p>生字練習簿小幫手 ／ 首頁視覺探索</p><span class="edition">ROUND 02 · 2026.11</span></div>
<div class="intro"><h1>喜歡的四種感覺，<br>再往前走五步。</h1><p>Gavin：「1–4 都還不錯。」<br>保留藍的清楚、莓果的親切、紫藤的安靜、墨白的書卷感。<br>版面與內容沿用原版，這輪只比較五種新的視覺組合。</p></div>
<p class="round-nav"><a href="#round2">Round 2 · 五個新變化</a><a href="#round1">Round 1 · 六版完整保留</a><a href="round-1/comparison.html">原 Round 1 對照頁 ↗</a></p>
<nav class="direction-index current-index" aria-label="Round 2 與基準方向">'''
    boards = '''</nav></header><main class="workspace" id="directions">
<div class="control-bar"><fieldset><legend>預覽尺寸</legend><label class="mode"><input type="radio" name="viewport" value="390" checked>手機 390</label><label class="mode"><input type="radio" name="viewport" value="1280">桌面 1280</label></fieldset><p class="scale-note">縮圖聚焦主操作區；原尺寸頁含完整頁尾。按鈕為示意。</p></div>
<noscript><p>JavaScript 未開啟：全部版本仍可開啟；請使用「原尺寸查看」，尺寸切換不生效。</p></noscript>
<section class="round-section" id="round2" aria-labelledby="round2-title"><div class="round-heading"><div><p>ROUND 02 ／ CONVERGENCE</p><h2 id="round2-title">五個新變化，與 R0 同場比較。</h2></div><span>第一欄始終是 R0 基準 · 尚未選定</span></div>
<p class="round-description">五版皆保留 R0 的字型、字重與字距，以配色、明暗分配、輪廓及陰影區分。紫藤的寬字距不帶入 R2；原 R1-3 保留歷史。</p>
<div class="board" data-width="390">'''
    history = '''</div></section><section class="round-section" id="round1" aria-labelledby="round1-title"><div class="round-heading"><div><p>ROUND 01 ／ HISTORY</p><h2 id="round1-title">六個初始方向，全部留在這裡。</h2></div><span>R1-1～R1-4 可接受；尚無單一首選</span></div>
<p class="round-description">R0 與 R1 原始頁面、樣式、字距及文字均保留。R1-3 在 1280px 的位移為 Owner 提供的已知問題（15 個元素，最大約 7.9px），本輪沒有改寫它；R1-5／R1-6 仍可比較。</p><nav class="direction-index history-index" aria-label="Round 1 歷史方向">'''
    notes = '''</div></section>
<section class="review-notes" aria-label="探索說明"><div><h2>只要描述喜歡的感覺。</h2><p>例如「R2-1 的乾淨，加上 R2-2 的親切」，或直接說一個編號。這輪沒有預設勝出者；不用挑顏色或色碼。</p><details><summary>本輪假設與沿用內容</summary><ul><li>「1–4 都還不錯」代表四版皆可接受，沒有先後排名。</li><li>操作者主要是台灣家長／老師，手機優先。</li><li>仍是回訪首頁：一年級上學期、第 1 課「拍拍手」，尚未產生輸出。</li><li>保留全部原文、入口順序、emoji、頁尾署名及授權。新配色避開綠色。</li><li>固定 R0 字體度量；不使用外部字型、不用固定高度裁字掩飾折行。</li></ul><p><a href="QUESTIONS.md">問題與假設紀錄</a> · <a href="SOURCE-NOTES.md">來源與採納理由</a></p></details></div>
<div><h2>這一輪只看首頁視覺。</h2><p>列印／PDF、考卷／解答、練習紙 A4、田字格、描紅、筆順 SVG、資料契約、演算法、Auth／RLS／備份／同步與產品測試都未變更、未接入預覽。</p><p>已計算：R2 每版 20 組指定文字色彩對比。<a href="contrast-round2.json">完整數值</a> · <a href="VALIDATION.md">驗證與量測限制</a></p><p>NOT MEASURED：390／1280px 實際 bounding box、截圖、折行與跨裝置顯示。瀏覽器控制服務不可用；已靜態確認所有 R2 使用 R0 的幾何 CSS 與字體度量，但不把它當成瀏覽器通過證據。</p><p><a href="layout-check.html">開啟 R0／R2 幾何比對頁</a>（本機 HTTP 預覽）。原站與重建版像素差、iOS Safari、列印／PDF 仍未驗證。</p></div></section></main>
<footer class="page-footer"><span>EXPLORATION ONLY · 尚未定案，未套用產品</span><span><a href="README.md">閱讀說明</a>　<a href="VALIDATION.md">檢查紀錄</a>　<a href="#">回到頁首 ↑</a></span></footer></body></html>'''
    baseline_card = old_cards[0].replace('<h2>', '<h3>').replace('</h2>', '</h3>')
    history_cards = [c.replace('<h2>', '<h3>').replace('</h2>', '</h3>') for c in old_cards[1:]]
    page = (intro + '\n'.join(index(d) for d in [old[0]] + new) + boards + baseline_card +
            '\n'.join(card(d) for d in new) + history + '\n'.join(index(d) for d in old[1:]) +
            '</nav><div class="board" data-width="390">' + '\n'.join(history_cards) + notes)
    (ROOT / 'comparison.html').write_text(page)
    for d in new:
        print(f'{d["id"]} {d["name"]}: 20 pairs; minimum {d["contrast"]["minimum"]:.3f}:1')
    print('Generated 5 R2 pages, R2 CSS/contrast, combined directions and comparison. History untouched.')


if __name__ == '__main__':
    render()
