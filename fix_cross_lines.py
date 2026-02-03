
import os
import re

css_path = 'styles.css'

try:
    content = ""
    # Try reading with different encodings
    for encoding in ['utf-8', 'utf-16', 'cp1252', 'latin-1']:
        try:
            with open(css_path, 'r', encoding=encoding) as f:
                content = f.read()
            break
        except UnicodeError:
            continue
    
    if not content:
        raise Exception("Failed to read styles.css")

    # The user says "last cell has no cross lines"
    # This means .tian-zi-ge::before / ::after might be hidden or height/width 0 in last child?
    # Or maybe .practice-cell:last-child overflow hidden is cutting it off?
    
    # We will append a STRONG fix to ensure they are visible.
    
    tian_zi_ge_fix = """
/* Force Cross Lines Fix (Tian Zi Ge) for Last Child */
.practice-cell:last-child .tian-zi-ge::before {
    content: '' !important;
    display: block !important;
    width: 100% !important;
    border-top: 1px dashed #3B4CCA !important;
    opacity: 0.8 !important;
    visibility: visible !important;
}

.practice-cell:last-child .tian-zi-ge::after {
    content: '' !important;
    display: block !important;
    height: 100% !important;
    border-left: 1px dashed #3B4CCA !important;
    opacity: 0.8 !important;
    visibility: visible !important;
}
"""
    
    # If the file doesn't already have this fix, append it.
    if "Force Cross Lines Fix" not in content:
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(content + tian_zi_ge_fix)
        print("Successfully appended tian-zi-ge fix to styles.css")
    else:
        print("Tian-zi-ge fix already present.")

except Exception as e:
    print(f"Error processing file: {str(e)}")
