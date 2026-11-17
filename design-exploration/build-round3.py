"""Build only R3 previews and the current gallery. Frozen R0–R2 are read-only.
Run: python3 -B design-exploration/build-round3.py
"""
from pathlib import Path
from html import escape
import importlib.util
import json
import re
import shutil

ROOT = Path(__file__).resolve().parent


def prior_module():
    spec = importlib.util.spec_from_file_location('round2_math', ROOT / 'build-round2.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def font_details(d):
    f = d['platform_fallbacks']
    return f'''<details class="type-spec"><summary>完整字型鏈 · Windows／iPhone · 字型下載 0 B</summary><dl>
<dt>標題 · {d['title_label']}</dt><dd>{escape(d['title_font'])}</dd>
<dt>正文 · {d['body_label']}</dt><dd>{escape(d['body_font'])}</dd>
<dt>Windows Chrome：標題</dt><dd>{f['windows']['title']}</dd>
<dt>Windows Chrome：正文</dt><dd>{f['windows']['body']}</dd>
<dt>iPhone Safari：標題</dt><dd>{f['iphone']['title']}</dd>
<dt>iPhone Safari：正文</dt><dd>{f['iphone']['body']}</dd>
<dt>可用性與取捨</dt><dd>{d['webfont_note']} 裝置實際選字：NOT MEASURED。字重由可用字面決定，可能使用最接近字重或合成粗體。</dd>
<dt>尺寸限制方法</dt><dd>{d['geometry_strategy']}</dd></dl></details>'''


def card(d, math):
    contrast = {r['pair']: r['ratio'] for r in d['contrast']['pairs']}
    return f'''<article class="direction" id="{d['slug']}">
<div class="card-caption"><div class="card-topline"><span class="direction-id">{d['id']}</span><span class="tag">{d['tag']}</span></div>
<h3>{d['name']}</h3><p class="parentline">{d['id']}（源自 {d['parent']}，字體：{d['tag']}）</p>
<p class="type-pair">標題：{d['title_label']}<br>正文：{d['body_label']}</p><p class="why">{d['why']}</p></div>
<div class="preview-label"><span>同版面・同內容・字體比較</span><span class="viewport-size">390 px · 等比例縮圖</span></div>
<div class="preview-window" style="--preview-bg:{d['tokens']['page']}"><iframe src="{d['slug']}.html" title="{d['id']} {d['name']} 字體預覽" sandbox="allow-same-origin allow-scripts" tabindex="-1" scrolling="no"></iframe></div>
<div class="card-detail"><p class="difference"><b>與其他 R3 最大差別</b>　{d['diff']}</p>{math.swatches(d)}
<p class="contrast">詞庫 {contrast['詞庫按鈕文字']:.3f}:1／練習紙 {contrast['練習紙按鈕文字']:.3f}:1<br>20 組指定文字最低 {d['contrast']['minimum']:.3f}:1，皆 ≥ 4.5:1。<br>sRGB 色票計算；不是實際字形或完整無障礙驗收。</p>
{font_details(d)}<a class="full-size" href="{d['slug']}.html" target="_blank" rel="noopener">原尺寸查看 · 含完整頁尾 <span aria-hidden="true">↗</span></a></div></article>'''


def section(round_id, title, subtitle, cards):
    return f'''<section class="round-section" id="round{round_id}" aria-labelledby="round{round_id}-title"><div class="round-heading"><div><p>ROUND 0{round_id}</p><h2 id="round{round_id}-title">{title}</h2></div></div><p class="round-description">{subtitle}</p><div class="board" data-width="390">{cards}</div></section>'''


def render():
    math = prior_module()
    old = json.loads((ROOT / 'round-2/directions.json').read_text())
    variants = json.loads((ROOT / 'round3-directions.json').read_text())
    history = (ROOT / 'round-2/comparison.html').read_text()
    old_cards = dict(re.findall(r'(<article class="direction" id="([^"]+)".*?</article>)', history, re.S))
    # Key by slug; source card markup stays byte-for-byte unchanged.
    old_cards = {slug: markup for markup, slug in old_cards.items()}
    styles = ['/* R3 font choices only. R2 palettes and screen.css remain unchanged. */']
    for d in variants:
        parent = next(p for p in old if p['id'] == d['parent'])
        assert d['parent'] in ('R2-1', 'R2-2', 'R2-4')
        assert d['copied_from'] == parent['slug'] + '.html'
        assert d['tokens'] == parent['tokens'], 'Palette / baseline metrics must remain the selected parent'
        pairs = math.measure(d)
        d['contrast'] = {'method': 'sRGB linearization; (lighter + .05) / (darker + .05)',
                         'minimum': min(r['ratio'] for r in pairs), 'pairs': pairs}
        target = ROOT / (d['slug'] + '.html')
        shutil.copyfile(ROOT / d['copied_from'], target)
        page = target.read_text()
        page = page.replace('<html lang="zh-Hant">', '<html lang="zh-Hant" class="r3-type-ready">')
        page = page.replace(f'<body class="{parent["slug"]}">', f'<body class="{parent["slug"]} {d["slug"]}">')
        page = page.replace(parent['id'] + ' ' + parent['name'], d['id'] + ' ' + d['name'])
        page = page.replace('comparison.html#' + parent['slug'], 'comparison.html#' + d['slug'])
        page = page.replace('</head>', '<link rel="stylesheet" href="typography-round3.css"><script src="typography-round3.js" defer></script></head>')
        target.write_text(page)
        styles.append(f'''body.{d['slug']} {{
  --r3-title-font: {d['title_font']};
  --r3-body-font: {d['body_font']};
  --r3-title-weight: {d['title_weight']};
  --r3-body-weight: {d['body_weight']};
}}''')
    styles.append('''html.r3-type-ready body { font-family: var(--r3-body-font); font-weight: var(--r3-body-weight); }
html.r3-type-ready .hero-title, html.r3-type-ready .home-task-entry h2 { font-family: var(--r3-title-font); font-weight: var(--r3-title-weight); letter-spacing: normal; }
html.r3-type-ready .hero-subtitle { font-family: var(--r3-body-font); }
/* Emoji geometry, small legal text, attribution and study notes remain R0. */
html.r3-type-ready .minimal-header .icon, html.r3-type-ready .hero-actions .icon, html.r3-type-ready .icon-shield { font-family: system-ui, -apple-system, 'PingFang TC', 'Microsoft JhengHei', sans-serif; }
html.r3-type-ready .icon-shield { font-weight: 400; }
html.r3-type-ready .ui-pro-footer { font-weight: 400; }
/* No hidden reference DOM, pseudo text, absolute text, transforms or clipping. */''')
    (ROOT / 'typography-round3.css').write_text('\n\n'.join(styles) + '\n')
    (ROOT / 'round3-directions.json').write_text(json.dumps(variants, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'directions.json').write_text(json.dumps(old + variants, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'contrast-round3.json').write_text(json.dumps({
        'method': 'sRGB linearization; (lighter + 0.05) / (darker + 0.05)',
        'scope': '20 specified text pairs per variant; not rendered pixels or full WCAG',
        'directions': {d['id']: d['contrast']['pairs'] for d in variants}}, ensure_ascii=False, indent=2) + '\n')
    intro = '''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Round 3 字體探索｜生字練習簿小幫手</title><link rel="stylesheet" href="comparison.css"><link rel="stylesheet" href="comparison-round2.css"><link rel="stylesheet" href="comparison-round3.css"><script src="comparison-round3.js" defer></script></head>
<body><a class="skip" href="#directions">跳至方向比較</a><header class="page-header"><div class="masthead"><p>生字練習簿小幫手 ／ 首頁視覺探索</p><span class="edition">ROUND 03 · TYPOGRAPHY</span></div>
<div class="intro"><h1>喜歡的顏色，<br>換六種字的表情。</h1><p>Gavin：「加入字體變化看看 2-1 2-2 2-4看起來都不錯」<br>延續藍墨、莓紅、藍莓三組配色，以黑體、圓體、明體與楷體比較閱讀感。<br>版面、內容不變；這輪仍未定案。</p></div>
<p class="round-nav"><a href="#round3">Round 3 · 六組字體</a><a href="#round2">Round 2 · 五版保留</a><a href="#round1">Round 1 · 六版保留</a><a href="round-2/comparison.html">原 Round 2 ↗</a><a href="round-1/comparison.html">原 Round 1 ↗</a></p>
<nav class="direction-index current-index" aria-label="Round 3 與 R0 基準">'''
    intro += '\n'.join(math.index(d) for d in [old[0]] + variants)
    intro += '''</nav><p class="round-note">全部使用本機字型，新增字型下載 0 B。圓體／楷體若未安裝會退回黑體，各卡片展開可見完整字型鏈。字形供首頁風格比較，並非習字範本。</p></header><main class="workspace" id="directions">
<div class="control-bar"><fieldset><legend>預覽尺寸</legend><label class="mode"><input type="radio" name="viewport" value="390" checked>手機 390</label><label class="mode"><input type="radio" name="viewport" value="1280">桌面 1280</label></fieldset><p class="scale-note">縮圖聚焦主操作；原尺寸頁保留完整頁尾。按鈕為示意。</p></div>
<noscript><p>JavaScript 未開啟：字體可顯示，但尺寸校準及尺寸切換不執行；請開原尺寸頁。未宣稱此模式符合 1px。</p></noscript>'''
    current_cards = old_cards[old[0]['slug']] + '\n'.join(card(d, math) for d in variants)
    rounds = section(3, '同樣的首頁，讓字體說話。', '第一欄 R0-0 基準。R3-1／3 同為藍墨，R3-2／5 同為莓紅，R3-4／6 同為藍莓，可以先在同色內比較字感。', current_cards)
    rounds += section(2, 'Round 2 完整保留。', 'Gavin 喜歡 R2-1、R2-2、R2-4。五版的原檔、同一套明體 900／系統黑體與配色都沒有覆寫。', '\n'.join(old_cards[d['slug']] for d in old if d.get('round') == 2))
    rounds += section(1, 'Round 1 六個初始方向。', '完整歷史仍可逐版開啟；包含原 R1-3 的已知字距位移，未在歷史頁修寫。', '\n'.join(old_cards[d['slug']] for d in old if d['id'].startswith('R1-')))
    notes = '''<section class="review-notes" aria-label="探索說明"><div><h2>以喜歡的字感繼續收斂。</h2><p>可用「R3-1 的清楚」、「R3-2 的圓潤」或「R3-4 的筆意」描述；不用選色碼，也沒有預設勝出者。</p><p>標題字級沿用 44.8px／24px，主要正文 16px，行高沿用 R0；必要時以小幅字距／字級校準保持原折行。全部文字留在原節點與正常流，不使用隱藏重建版、裁字或文字圖片。</p><p><a href="QUESTIONS.md">Round 3 問題與假設</a> · <a href="SOURCE-NOTES.md">字體來源與度量策略</a></p></div>
<div><h2>量測與保護界線。</h2><p>已計算六版共 120 組指定文字色彩對比，<a href="contrast-round3.json">完整數值</a>。對比來自色票，不是字型實際渲染採樣。</p><p><strong>NOT MEASURED：</strong>390／1280px 實際 bounding box、折行、截圖、Windows Chrome、iPhone Safari 與實際字型。瀏覽器控制服務 unavailable；校準程式存在不代表驗證通過。</p><p><a href="layout-check-round3.html">R0／R3 全元素幾何觀察頁</a> · <a href="VALIDATION.md">已執行檢查與限制</a></p><p>列印／PDF、考卷／解答、練習紙 A4、田字格、描紅、筆順 SVG、fonts、資料契約、演算法、Auth／RLS／備份／同步與產品測試均未修改、未接入預覽。</p></div></section></main>
<footer class="page-footer"><span>EXPLORATION ONLY · 尚未定案，未套用產品</span><span><a href="README.md">閱讀說明</a>　<a href="VALIDATION.md">檢查紀錄</a>　<a href="#">回到頁首 ↑</a></span></footer></body></html>'''
    (ROOT / 'comparison.html').write_text(intro + rounds + notes)
    for d in variants:
        print(f'{d["id"]} <- {d["parent"]}: {d["tag"]}; contrast min {d["contrast"]["minimum"]:.3f}:1')
    print('Generated six R3 pages; original R0–R2 pages/styles/data untouched.')


if __name__ == '__main__':
    render()
