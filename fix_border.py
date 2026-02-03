
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
            print(f"Successfully read styles.css with encoding: {encoding}")
            break
        except UnicodeError:
            continue
    
    if not content:
        raise Exception("Failed to read styles.css with any common encoding")

    # The block to remove:
    # .practice-cell:last-child {
    #     border-bottom: none;
    # }
    
    # Regex to find and remove this block, handling whitespace
    pattern = r'\.practice-cell:last-child\s*\{\s*border-bottom:\s*none;\s*\}'
    
    if re.search(pattern, content):
        new_content = re.sub(pattern, '', content)
        # Clean up any potential double newlines left behind
        # new_content = re.sub(r'\n\s*\n', '\n', new_content)
        
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully removed .practice-cell:last-child rule and saved as UTF-8")
    else:
        print("Target CSS rule not found. It might have been already removed or strict matching failed.")
        # Even if not found, we save as utf-8 to ensure encoding is fixed if we read it successfully
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
except Exception as e:
    print(f"Error processing file: {str(e)}")
