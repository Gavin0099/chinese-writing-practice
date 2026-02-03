
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

    # Forcefully replace the specific offending block
    # Logic: Look for .practice-cell:last-child { border-bottom: none; }
    # and replace with empty string or comment out.
    
    # We use a very broad regex to catch it even if there are weird spaces
    pattern = r'\.practice-cell:last-child\s*\{\s*border-bottom:\s*none;?\s*\}'
    
    if re.search(pattern, content):
        print("Found the offending rule. Removing it...")
        new_content = re.sub(pattern, '/* Rule removed by Code Agent */', content)
        
        # Also, let's ensure .practice-cell HAS a border
        # Find .practice-cell definition and ensure border-bottom is set
        # This is a bit risky with regex, so let's just append a helper class at the end
        # to guarantee the border exists.
        
        explicit_fix = "\n/* Force Border Fix */\n.practice-cell {\n    border-bottom: 1px solid #3B4CCA !important;\n}\n"
        new_content += explicit_fix

        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully patched styles.css")
    else:
        print("Target CSS rule not found via Regex. Appending forced fix anyway.")
        explicit_fix = "\n/* Force Border Fix - Append */\n.practice-cell:last-child {\n    border-bottom: 1px solid #3B4CCA !important;\n}\n"
        with open(css_path, 'w', encoding='utf-8') as f:
            f.write(content + explicit_fix)
            
except Exception as e:
    print(f"Error processing file: {str(e)}")
