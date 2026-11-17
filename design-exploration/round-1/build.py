"""Rebuild only the offline visual study, using Python's standard library.

Run: python3 -B design-exploration/build.py
No product files, data, fonts, packages, or network resources are loaded.
"""
from pathlib import Path
import html
import json

ROOT = Path(__file__).resolve().parent
SANS = "system-ui, -apple-system, 'PingFang TC', 'Microsoft JhengHei', sans-serif"
SERIF = "'Songti TC', 'PMingLiU', 'MingLiU', serif"
ROUND = "ui-rounded, 'PingFang TC', 'Microsoft JhengHei', sans-serif"
MONO = "ui-monospace, 'SFMono-Regular', Consolas, 'PingFang TC', monospace"

COMMON = {
    'body-font': SANS, 'heading-font': SANS, 'label-font': SANS,
    'heading-weight': '800', 'entry-weight': '700', 'label-weight': '400',
    'heading-tracking': 'normal', 'card-shadow': 'none', 'button-shadow': 'none',
    'footer-shadow': 'none',
}


def theme(page, surface, text, muted, primary, hover, on_primary, **overrides):
    tokens = dict(COMMON)
    tokens.update({
        'page': page, 'surface': surface, 'text': text, 'title': text,
        'entry-text': text, 'muted': muted, 'description': muted, 'hint': muted,
        'nav': text, 'primary': primary, 'primary-hover': hover,
        'on-primary': on_primary, 'secondary': primary, 'secondary-hover': hover,
        'on-secondary': on_primary, 'rule': muted, 'card-border': muted,
        'focus': primary, 'footer-bg': page, 'footer-border': muted,
        'footer-text': text, 'credit': muted, 'credit-link': text,
        'badge-bg': surface, 'badge-text': text, 'badge-border': muted,
        'feedback': primary, 'on-feedback': on_primary,
    })
    tokens.update(overrides)
    return tokens


DIRECTIONS = [
    {
        'id': 'R0-0', 'slug': 'r0-current', 'name': '現況重建', 'tag': '比較基準',
        'why': '保留目前灰綠按鈕與明體課名，作為這一輪的起點。這是程式碼重建，非實測截圖。',
        'diff': '兩種綠色按鈕、明體粗標題與柔陰影；保留目前偏淡的提示文字。',
        'type': '明體 900／系統黑體；依離線 fallback 顯示',
        'tradeoff': '白字灰綠按鈕與淡提示對比不足；不視為新提案。',
        'tokens': theme('#FFFFFF', '#FFFFFF', '#212529', '#64748B', '#305B47', '#254A39', '#FFFFFF', **{
            'title': '#334155', 'entry-text': '#24352D', 'description': '#52645A',
            'hint': '#A0AEC0', 'nav': '#305B47', 'secondary': '#8DA399',
            'secondary-hover': '#7B8E84', 'rule': '#D5DFD5', 'card-border': '#F7F7F7',
            'heading-font': SERIF, 'heading-weight': '900',
            'card-shadow': '0 10px 25px -5px rgba(0,0,0,.05), 0 8px 10px -6px rgba(0,0,0,.05)',
            'button-shadow': '0 4px 15px rgba(143,162,152,.3)',
            'footer-bg': 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
            'footer-border': '#E2E8F0', 'footer-text': '#475569', 'credit': '#94A3B8',
            'credit-link': '#64748B', 'badge-bg': '#F0FDF4', 'badge-text': '#166534',
            'badge-border': '#BBF7D0', 'feedback': '#60A5FA',
            'footer-shadow': '0 4px 6px -1px rgba(0,0,0,.05), 0 2px 4px -1px rgba(0,0,0,.03)',
        }),
    },
    {
        'id': 'R1-1', 'slug': 'r1-1-blue', 'name': '晴空藍', 'tag': '清晰・俐落',
        'why': '乾淨藍白配色，讓家長與老師一眼找到操作入口；適合每天反覆使用。',
        'diff': '飽和藍按鈕配冷白底，厚黑體課名；六版中最接近熟悉的工作工具。',
        'type': '系統黑體 800／緊字距；正文維持系統字',
        'tradeoff': '辨識清楚，但品牌個性相對保守。',
        'tokens': theme('#F1F6FF', '#FFFFFF', '#182B49', '#52627B', '#2454C6', '#1D43A0', '#FFFFFF', **{
            'nav': '#234AA0', 'rule': '#CAD7EC', 'card-border': '#D1DDEF',
            'footer-border': '#CAD7EC', 'badge-border': '#CAD7EC',
            'heading-tracking': '-.025em',
            'card-shadow': '0 8px 18px -10px rgba(36,84,198,.18)',
        }),
    },
    {
        'id': 'R1-2', 'slug': 'r1-2-berry', 'name': '莓果日常', 'tag': '親切・柔和',
        'why': '淡粉底搭配深莓紅，讓陪孩子練字的日常更親近，也保有成人工具的清楚感。',
        'diff': '溫柔色面與較圓潤的中粗字；以莓紅取代慣見的奶油色和橘色。',
        'type': '系統圓體優先 650／無圓體時回退黑體',
        'tradeoff': '情緒較柔和，個性比藍白更鮮明。',
        'tokens': theme('#FCEFF4', '#FFFAFC', '#492337', '#795269', '#9B315E', '#7C2349', '#FFFFFF', **{
            'heading-font': ROUND, 'heading-weight': '650', 'entry-weight': '650',
            'rule': '#E6C8D5', 'card-border': '#EACEDB', 'footer-border': '#E6C8D5',
            'badge-border': '#E6C8D5', 'card-shadow': '0 10px 25px -12px rgba(115,41,77,.18)',
        }),
    },
    {
        'id': 'R1-3', 'slug': 'r1-3-violet', 'name': '紫藤留白', 'tag': '輕盈・安定',
        'why': '帶紫的淡灰與葡萄紫按鈕，降低視覺重量，適合想要安靜而有辨識度的首頁。',
        'diff': '中等字重與略寬字距，平面淡紫卡片；比莓果冷靜，也比藍白柔軟。',
        'type': '系統黑體 500／寬字距 .025em',
        'tradeoff': '標題刻意較輕；喜歡強烈層級的人可能偏好 01 或 05。',
        'tokens': theme('#F4F1FC', '#FCFBFF', '#34284D', '#6A5A7B', '#6C42AC', '#533181', '#FFFFFF', **{
            'heading-weight': '500', 'entry-weight': '600', 'heading-tracking': '.025em',
            'nav': '#60408D', 'rule': '#D9CCE9', 'card-border': '#D9CCE9',
            'footer-border': '#D9CCE9', 'badge-border': '#D9CCE9',
        }),
    },
    {
        'id': 'R1-4', 'slug': 'r1-4-ink', 'name': '墨白編輯', 'tag': '克制・書卷',
        'why': '用黑白與明體的筆畫對比呼應中文閱讀，讓首頁像一件沉穩的教學工具。',
        'diff': '唯一完全無彩色的新提案；明體課名、細黑輪廓、無浮起陰影。',
        'type': '系統明體 700／正文系統黑體',
        'tradeoff': '安定耐看，活潑感較低；明體外觀依裝置而異。',
        'tokens': theme('#F4F4F4', '#FFFFFF', '#202020', '#626262', '#242424', '#000000', '#FFFFFF', **{
            'heading-font': SERIF, 'heading-weight': '700', 'heading-tracking': '.015em',
            'rule': '#BEBEBE', 'card-border': '#969696', 'footer-border': '#BEBEBE',
            'badge-border': '#BEBEBE', 'label-font': MONO, 'label-weight': '500',
        }),
    },
    {
        'id': 'R1-5', 'slug': 'r1-5-yellow', 'name': '鉛筆黃', 'tag': '明快・有勁',
        'why': '以鉛筆般的亮黃配黑字，保留小學用品的明朗感，又讓成人容易辨讀。',
        'diff': '黃底黑字按鈕、最厚字重與實線投影；不改原卡片圓角及位置。',
        'type': '系統黑體 900／等寬課次標籤',
        'tradeoff': '最醒目、最有活力，也比其他淺色方向更強勢。',
        'tokens': theme('#F1F2F4', '#FFFFFF', '#27272A', '#5B5A53', '#F2CC4D', '#DAB43B', '#272111', **{
            'rule': '#A5A5A3', 'card-border': '#363636', 'footer-border': '#C0C0BC',
            'badge-border': '#A5A5A3', 'heading-weight': '900', 'label-weight': '600',
            'label-font': MONO, 'card-shadow': '4px 4px 0 #D3D3CE', 'focus': '#27272A',
            'button-shadow': '0 2px 0 #8B762B',
        }),
    },
    {
        'id': 'R1-6', 'slug': 'r1-6-night', 'name': '夜讀靛藍', 'tag': '深色・沉靜',
        'why': '深靛藍底配淡藍按鈕，提供晚上備課、陪讀時截然不同的視覺選擇。',
        'diff': '唯一深色方向；細黑體大標題配等寬課次，亮度關係與其他五版相反。',
        'type': '系統黑體 350／等寬課次標籤',
        'tradeoff': '這是獨立風格提案，不增加深色模式開關；戶外閱讀仍需實機評估。',
        'tokens': theme('#141C30', '#202C45', '#F1F4FF', '#B8C3DC', '#B8CCFF', '#D0DDFF', '#192744', **{
            'rule': '#46546F', 'card-border': '#53617C', 'footer-border': '#46546F',
            'badge-border': '#53617C', 'nav': '#C9D7FF', 'heading-weight': '350',
            'entry-weight': '600', 'label-font': MONO, 'label-weight': '400',
            'heading-tracking': '-.02em', 'card-shadow': '0 12px 24px -10px rgba(0,0,0,.2)',
        }),
    },
]


def luminance(color):
    channels = [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    rgb = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in channels]
    return sum(a * b for a, b in zip(rgb, (.2126, .7152, .0722)))


def contrast(a, b):
    high, low = sorted((luminance(a), luminance(b)), reverse=True)
    return (high + .05) / (low + .05)


PAIRS = [
    ('正文／頁底', 'text', 'page'), ('入口標題／頁底', 'entry-text', 'page'),
    ('入口說明／頁底', 'description', 'page'), ('導覽／頁底', 'nav', 'page'),
    ('品牌／頁底', 'muted', 'page'), ('課名／卡片', 'title', 'surface'),
    ('年級／卡片', 'muted', 'surface'), ('提示／卡片', 'hint', 'surface'),
    ('詞庫按鈕文字', 'on-primary', 'primary'), ('詞庫 hover 文字', 'on-primary', 'primary-hover'),
    ('練習紙按鈕文字', 'on-secondary', 'secondary'), ('練習紙 hover 文字', 'on-secondary', 'secondary-hover'),
    ('署名／頁尾', 'credit', 'footer-bg'), ('來源連結／頁尾', 'credit-link', 'footer-bg'),
    ('授權標籤文字', 'badge-text', 'badge-bg'), ('回饋按鈕文字', 'on-feedback', 'feedback'),
    ('作者說明／卡片', 'muted', 'surface'),
]


def measure(direction):
    t = direction['tokens']
    rows = []
    for label, foreground, background in PAIRS:
        # Baseline footer is a gradient: evaluate both specified endpoints.
        backgrounds = ['#F8FAFC', '#F1F5F9'] if background == 'footer-bg' and t[background].startswith('linear') else [t[background]]
        ratio = min(contrast(t[foreground], color) for color in backgrounds)
        rows.append({'pair': label, 'foreground': t[foreground], 'background': backgrounds, 'ratio': round(ratio, 3), 'meets_4_5': ratio >= 4.5})
    return rows


def swatches(d):
    colors = [d['tokens'][key] for key in ('page', 'surface', 'text', 'primary', 'secondary')]
    return '<span class="swatches" aria-hidden="true">' + ''.join(f'<i style="--swatch:{c}"></i>' for c in colors) + '</span>'


def render():
    fragment = (ROOT / 'screen.html').read_text(encoding='utf-8')
    styles = ['/* Proposed visual tokens only. Layout lives in screen.css. */']
    measured = {}
    cards = []
    index = []
    for d in DIRECTIONS:
        slug = d['slug']
        measured[d['id']] = measure(d)
        styles.append(f'body.{slug} {{\n' + '\n'.join(f'  --{key}: {value};' for key, value in d['tokens'].items()) + '\n}')
        (ROOT / f'{slug}.html').write_text(f'''<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="{'dark' if slug == 'r1-6-night' else 'light'}">
<title>{d['id']} {d['name']}｜首頁靜態視覺示意</title>
<link rel="stylesheet" href="screen.css"><link rel="stylesheet" href="themes.css"></head>
<body class="{slug}">{fragment}
<aside class="study-disclaimer"><p>視覺示意：{d['id']} {d['name']}。按鈕不執行功能；未載入產品程式、列印內容或資料。</p><a href="comparison.html#{slug}">返回方向比較</a></aside>
</body></html>''', encoding='utf-8')
        primary = next(row['ratio'] for row in measured[d['id']] if row['pair'] == '詞庫按鈕文字')
        secondary = next(row['ratio'] for row in measured[d['id']] if row['pair'] == '練習紙按鈕文字')
        fail_count = sum(not row['meets_4_5'] for row in measured[d['id']])
        pass_text = f'{fail_count} 組字色低於 4.5:1' if fail_count else '17 組指定字色皆 ≥ 4.5:1'
        index.append(f'<a class="index-link" href="#{slug}">{swatches(d)}<span class="index-label"><b>{"00" if d["id"] == "R0-0" else "0" + d["id"][-1]}</b>{d["name"]}</span></a>')
        cards.append(f'''<article class="direction" id="{slug}">
<div class="card-caption"><div class="card-topline"><span class="direction-id">{d['id']}</span><span class="tag">{d['tag']}</span></div><h2>{d['name']}</h2><p class="why">{d['why']}</p></div>
<div class="preview-label"><span>同版面・固定示範內容</span><span class="viewport-size">390 px · 等比例縮圖</span></div>
<div class="preview-window" style="--preview-bg:{d['tokens']['page']}"><iframe src="{slug}.html" title="{d['id']} {d['name']} 首頁視覺示意" sandbox="allow-same-origin" tabindex="-1" scrolling="no"></iframe></div>
<div class="card-detail"><p class="difference"><b>這版的個性</b>　{d['diff']}<br><b>字體表情</b>　{d['type']}<br><b>取捨</b>　{d['tradeoff']}</p>{swatches(d)}
<p class="contrast">詞庫按鈕 {primary:.2f}:1／練習紙按鈕 {secondary:.2f}:1<br>{pass_text} · 僅色票計算</p>
<a class="full-size" href="{slug}.html" target="_blank" rel="noopener">原尺寸查看 · 含完整頁尾 <span aria-hidden="true">↗</span></a></div></article>''')
    styles.append('.study-disclaimer { margin: 0; padding: 20px 24px; background: #eef0f4; color: #374151; font: 14px/1.6 system-ui, sans-serif; }\n.study-disclaimer p { margin: 0 0 8px; }\n.study-disclaimer a { color: #244989; min-height: 44px; display: inline-flex; align-items: center; }\n.study-disclaimer a:focus-visible { outline: 3px solid #244989; outline-offset: 3px; }')
    (ROOT / 'themes.css').write_text('\n\n'.join(styles) + '\n', encoding='utf-8')
    (ROOT / 'directions.json').write_text(json.dumps(DIRECTIONS, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'contrast.json').write_text(json.dumps({'method': 'sRGB linearization; (lighter + 0.05) / (darker + 0.05); normal-text target 4.5:1', 'scope': '17 specified text pairs per direction; not a browser or full accessibility audit', 'directions': measured}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'comparison.html').write_text('''<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>首頁視覺探索 01｜生字練習簿小幫手</title>
<link rel="stylesheet" href="comparison.css"><script src="comparison.js" defer></script></head>
<body><a class="skip" href="#directions">跳至方向比較</a>
<header class="page-header">
  <div class="masthead"><p>生字練習簿小幫手 ／ 首頁視覺探索</p><span class="edition">ROUND 01 · 2026.11</span></div>
  <div class="intro"><h1>同一個首頁，<br>六種新的表情。</h1><p>沿用已接受的排版，探索配色、字體與質感。<br>00 是現況，01–06 是新提案；選喜歡的編號就好。</p></div>
  <nav class="direction-index" aria-label="跳至視覺方向">''' + '\n'.join(index) + '''</nav>
</header>
<main class="workspace" id="directions">
  <div class="control-bar"><fieldset><legend>預覽尺寸</legend><label class="mode"><input type="radio" name="viewport" value="390" checked>手機 390</label><label class="mode"><input type="radio" name="viewport" value="1280">桌面 1280</label></fieldset><p class="scale-note">縮圖僅供比較；完整頁含頁尾，按鈕為示意。</p></div>
  <noscript><p>JavaScript 未開啟：以下仍可比較全部方向；請用「原尺寸查看」檢視完整畫面，尺寸切換不生效。</p></noscript>
  <div class="board" data-width="390">''' + '\n'.join(cards) + '''</div>
  <section class="review-notes" aria-label="探索說明">
    <div><h2>先選感覺，不用選色碼。</h2><p>可以說「喜歡 02 的親切感，但想要 01 的按鈕」，或直接選一個方向。這輪沒有預設勝出者；後續變體會另存，保留這七版。</p><p>畫面維持：工具導覽 → 老師詞庫入口 → 推薦練習紙 → 自訂設定 → 原頁尾。尺寸、間距與圓角共用同一份 CSS。</p><details><summary>這次採用的假設</summary><ul><li>主要操作者是家長與老師，以手機優先。</li><li>固定回訪首頁、課程已載入；一年級上學期第 1 課「拍拍手」，尚未開啟輸出。</li><li>不顯示首次設定、筆順彈窗與展開後的自訂面板。</li><li>未指定品牌字型；只用系統字型，不載入外部字型。實際字型可能依裝置回退。</li><li>六個新方向都避開綠色；保留既有 emoji，避免混入圖示改版。</li></ul><p>完整八題與假設：<a href="QUESTIONS.md">QUESTIONS.md</a></p></details></div>
    <div><h2>這一輪只看首頁。</h2><p>列印／PDF、考卷、解答、練習紙 A4、田字格、描紅、筆順 SVG 全部不在預覽中重畫；詞庫、Supabase、抽題與種子、注音／挖空、登入、RLS、備份及同步均未接入。</p><p>已計算：每版 17 組指定文字色彩對比。這不代表完整無障礙驗收。<a href="contrast.json">查看配對結果</a></p><p>NOT MEASURED：原站與重建版像素差、390／1280 實際折行與溢出、瀏覽器截圖、iOS Safari、列印與 PDF 輸出。瀏覽器控制服務不可用；本機未找到 Node 或 Chrome 命令。</p><p>現況依 HTML／CSS／JS 重建。Bootstrap 級聯以本機 CSS 摘要重建，Google 字型以系統字體替代；不宣稱像素一致。<a href="SOURCE-NOTES.md">重建依據</a></p></div>
  </section>
</main>
<footer class="page-footer"><span>EXPLORATION ONLY · 尚未定案，未套用產品</span><span><a href="README.md">閱讀說明</a>　<a href="VALIDATION.md">檢查紀錄</a>　<a href="#">回到頁首 ↑</a></span></footer>
</body></html>''', encoding='utf-8')
    for ident, rows in measured.items():
        print(f'{ident}: {len(rows)} pairs, minimum {min(row["ratio"] for row in rows):.3f}:1, failures {sum(not row["meets_4_5"] for row in rows)}')
    print('Generated seven standalone screens, comparison.html, themes.css, directions.json, contrast.json.')


if __name__ == '__main__':
    render()
