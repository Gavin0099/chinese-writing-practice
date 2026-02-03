import os

css_path = 'styles.css'
new_content = """
/* =========================================
   FINAL STABLE PRINT IMPLEMENTATION (Spec v1.1)
   ========================================= */
@media print {
    /* 1. 強力隔離 - 僅顯示練習簿核心區域 */
    body > *:not(.hero-section) {
        display: none !important;
    }
    
    .hero-section > .container:not(#legacyControls),
    .minimal-header,
    .secondary-actions,
    .data-attribution,
    .stroke-modal-overlay {
        display: none !important;
    }

    #legacyControls {
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
    }

    #legacyControls .row > *:not(.col-lg-8),
    .card-header,
    .empty-state {
        display: none !important;
    }

    #legacyControls .col-lg-8 {
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        flex: 0 0 100% !important;
    }

    #previewSection {
        padding: 0 !important;
        margin: 0 !important;
        background: white !important;
    }

    #previewSection > *:not(#sheets-container),
    #sheets-container > *:not(.sheet-page) {
        display: none !important;
    }

    #sheets-container {
        display: block !important;
        padding: 0 !important;
        margin: 0 !important;
    }

    /* 2. 頁面邊距校準 (Safari & Chrome Fix) */
    @page {
        size: A4 portrait;
        margin: 0;
    }

    html, body {
        width: 210mm !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    /* 3. 練習紙尺寸精準修復 */
    .sheet-page {
        display: flex !important;
        flex-direction: column !important;
        width: 210mm !important;
        height: 285mm !important;
        margin: 0 !important;
        padding: 10mm !important;
        page-break-after: always !important;
        break-after: page !important;
        box-shadow: none !important;
        border: none !important;
        background: white !important;
        overflow: hidden !important;
    }

    /* 4. 內部元素穩定性 */
    .sheet-header {
        visibility: visible !important;
        border-bottom: 2px solid #3B4CCA !important;
    }

    .sheet-body {
        display: flex !important;
        flex-direction: row-reverse !important;
        width: 100% !important;
        height: 245mm !important;
        overflow: hidden !important;
    }
}
"""

try:
    # Try different encodings to read the messed up file
    content = ""
    for encoding in ['utf-16', 'utf-8', 'latin-1']:
        try:
            with open(css_path, 'r', encoding=encoding) as f:
                content = f.read()
            if content: break
        except:
            continue
    
    # Trim everything after the last known good comment or at the start of corruption
    # Looking at the view_file, line 1700 was where corruption started.
    import re
    # Remove the corrupted parts starting with "/* ???" or similar
    content = re.sub(r'/\*\s+\?{3}.*$', '', content, flags=re.DOTALL)
    
    # Also remove any existing print monolith section to avoid duplicates
    content = re.sub(r'/\* =+.*?PRINT MONOLITH.*?=+\s+\*/.*?(@media print\s+\{.*?\})', '', content, flags=re.DOTALL)

    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + "\n" + new_content)
    print("Successfully fixed styles.css")
except Exception as e:
    print(f"Error: {str(e)}")
