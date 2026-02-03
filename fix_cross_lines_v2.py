
import os
import re

css_path = 'styles.css'

try:
    with open(css_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The WRONG selector we added: .practice-cell:last-child .tian-zi-ge::before
    # The CORRECT selector should be: .practice-cell:last-child::before (since the element HAS class tian-zi-ge)
    
    # We will replace the whole block we added previously.
    
    bad_block_before = r'\.practice-cell:last-child \.tian-zi-ge::before'
    bad_block_after = r'\.practice-cell:last-child \.tian-zi-ge::after'
    
    # Replace with correct selectors
    new_content = re.sub(bad_block_before, '.practice-cell:last-child::before', content)
    new_content = re.sub(bad_block_after, '.practice-cell:last-child::after', new_content)
    
    if new_content != content:
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully corrected CSS selectors in styles.css")
    else:
        print("Could not find the specific bad selectors. Attempting to append correct ones instead.")
        
        correct_fix = """
/* Corrected Force Cross Lines Fix */
.practice-cell:last-child::before {
    content: '' !important;
    display: block !important;
    width: 100% !important;
    border-top: 1px dashed #3B4CCA !important;
    opacity: 0.8 !important;
    visibility: visible !important;
    z-index: 1 !important;
    pointer-events: none !important;
    position: absolute !important;
    top: 50% !important;
    left: 0 !important;
}

.practice-cell:last-child::after {
    content: '' !important;
    display: block !important;
    height: 100% !important;
    border-left: 1px dashed #3B4CCA !important;
    opacity: 0.8 !important;
    visibility: visible !important;
    z-index: 1 !important;
    pointer-events: none !important;
    position: absolute !important;
    left: 50% !important;
    top: 0 !important;
}
"""
        with open(css_path, 'a', encoding='utf-8') as f:
            f.write(correct_fix)
        print("Appended corrected rules to end of file.")

except Exception as e:
    print(f"Error processing file: {str(e)}")
