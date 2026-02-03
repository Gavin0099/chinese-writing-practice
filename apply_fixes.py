
import os
import re

css_path = 'styles.css'
html_path = 'index.html'
footer_path = 'footer_snippet.html'

# 1. CSS Nuclear Fix for Cross Lines
try:
    with open(css_path, 'r', encoding='utf-8') as f:
        css = f.read()

    # Define the NUCLEAR fix block
    # Note: We include -webkit-print-color-adjust: exact to ensure background/borders print
    # We apply it specifically to print AND generally
    
    nuclear_fix = """
/* NUCLEAR FIX FOR CROSS LINES IN PRINT */
@media print {
    .practice-cell:last-child {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        border-bottom: 1px solid #3B4CCA !important;
        position: relative !important;
        z-index: 10 !important;
        overflow: visible !important;
    }

    /* Force Pseudo Elements Visible */
    .practice-cell:last-child::before,
    .practice-cell:last-child::after {
        content: '' !important;
        display: block !important;
        position: absolute !important;
        opacity: 1 !important; /* Force full opacity in print */
        visibility: visible !important;
        border-color: #999 !important; /* Use darker color for print visibility if needed, or keep original */
        border-style: dashed !important;
        border-width: 1px !important;
        z-index: 20 !important;
    }
    
    /* Horizontal Line */
    .practice-cell:last-child::before {
        width: 100% !important;
        height: 0 !important;
        top: 50% !important;
        left: 0 !important;
        border-top: 1px dashed #3B4CCA !important;
    }
    
    /* Vertical Line */
    .practice-cell:last-child::after {
        width: 0 !important;
        height: 100% !important;
        top: 0 !important;
        left: 50% !important;
        border-left: 1px dashed #3B4CCA !important;
    }
}
"""
    # Append to end of file
    if "NUCLEAR FIX" not in css:
        with open(css_path, 'a', encoding='utf-8') as f:
            f.write(nuclear_fix)
        print("CSS: Appended Nuclear Fix")
    else:
        print("CSS: Nuclear Fix already present")
        
except Exception as e:
    print(f"CSS Error: {e}")

# 2. Inject Footer into HTML
try:
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    with open(footer_path, 'r', encoding='utf-8') as f:
        footer_html = f.read()
        
    # Inject before </body>
    # Check if footer already exists to avoid duplicates
    if 'id="appFooter"' not in html:
        new_html = html.replace('</body>', f'{footer_html}\n</body>')
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print("HTML: Injected Feedback Footer")
    else:
        print("HTML: Footer already exists")
        
except Exception as e:
    print(f"HTML Error: {e}")
