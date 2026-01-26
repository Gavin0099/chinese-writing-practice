import os
import json
import re
import glob
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Target JS in root
JS_FILE = os.path.join(BASE_DIR, "..", "curriculum_data.js")

def load_js_data(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract JSON part
    # Look for window.CURRICULUM_KANGHSUAN = { ... }
    match = re.search(r"window\.CURRICULUM_KANGHSUAN\s*=\s*(\{.*?\})\s*$", content, re.DOTALL)
    if not match:
        # Maybe semicolon at end
        match = re.search(r"window\.CURRICULUM_KANGHSUAN\s*=\s*(\{.*?\});\s*$", content, re.DOTALL)
    
    if match:
        json_str = match.group(1)
        # JS object keys might not be quoted? The file usually is valid JSON structure inside.
        # Let's hope it's valid JSON.
        try:
            data = json.loads(json_str)
            return data, content
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            # Fallback: using a simple manual parser or assume it's mostly valid
            # In the file viewed earlier, it was valid JSON syntax (keys quoted).
            return None, content
    return None, content

def parse_xml(filepath):
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
        
        # Get Name
        name_tag = root.find(".//INFO/NAME")
        if name_tag is None:
            return None
        full_title = name_tag.text # e.g. "第一課：拍拍手"
        
        # Parse Lesson Num and Title
        # "第一課：拍拍手"
        if "：" in full_title:
            parts = full_title.split("：", 1)
            lesson_str = parts[0]
            title = parts[1]
        else:
            title = full_title
            lesson_str = "0"
            
        # Lesson Num to Int
        cn_nums = {'一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10, '十一':11, '十二':12}
        lesson_num = 0
        for k, v in cn_nums.items():
            if f"第{k}課" == lesson_str:
                lesson_num = v
                break
        
        # Concepts
        concepts = []
        for entry in root.findall(".//ENTRY"):
            c = entry.find("CONCEPT").text
            if c and len(c.strip()) == 1:
                concepts.append(c.strip())
        
        # Filter duplicates whilst preserving order
        seen = set()
        vocab = []
        for c in concepts:
            if c not in seen:
                vocab.append(c)
                seen.add(c)
                
        return {
            "lesson": lesson_num,
            "title": title.strip(),
            "vocab": vocab
        }
    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
        return None

def main():
    print(f"Loading {JS_FILE}...")
    data, original_content = load_js_data(JS_FILE)
    if not data:
        print("Failed to load JS data.")
        return

    # Process XMLs
    xml_files = glob.glob(os.path.join(BASE_DIR, "*.xml"))
    print(f"Found {len(xml_files)} XML files.")
    
    # Heuristic for Semester mapping
    # 1A currently has L1-L5. 1B has L1-L12.
    # Titles in 1B known from JS: 
    # 看, 花園裡有什麼？, 媽媽的音樂會, 鞋, 小種子快長大, 奶奶的小跟班, 作夢的雲, 妹妹的紅雨鞋, 七彩的虹, 和你在一起, 生日快樂, 小黑
    
    known_1b_titles = [
        "看", "花園裡有什麼？", "花園裡有什麼", "媽媽的音樂會", "鞋", 
        "小種子快長大", "奶奶的小跟班", "作夢的雲", "妹妹的紅雨鞋", 
        "七彩的虹", "和你在一起", "生日快樂", "小黑"
    ]
    
    # 1A titles: 拍拍手, 這是誰的?, 秋千, 大個子，小個子, 比一比, 小路(Guessed)
    
    mapping_stats = {"1A": 0, "1B": 0}

    for xml_path in xml_files:
        info = parse_xml(xml_path)
        if not info:
            continue
            
        lesson_num = info['lesson']
        title = info['title']
        vocab = info['vocab']
        
        print(f"Processing: L{lesson_num} {title} ({len(vocab)} chars)")
        
        # Determine Semester
        semester = "A"
        # Check if title matches 1B list (fuzzy)
        is_1b = False
        for kto in known_1b_titles:
            # Normalize punctuation
            if kto.replace('？','').replace('?','') == title.replace('？','').replace('?',''):
                is_1b = True
                break
        
        if is_1b:
            semester = "B"
        
        # Special case: "小路" -> 1A?
        # If not matched 1B, default to A?
        # Or check if lesson num collision in A?
        
        target_grade = "1"
        target_sem = semester
        
        # Access Data
        if target_grade not in data["structure"]:
            data["structure"][target_grade] = {"A": [], "B": []}
            
        lesson_list = data["structure"][target_grade][target_sem]
        
        # Find existing lesson
        found = False
        for l in lesson_list:
            # Check Title Match (Punctuation relaxed)
            js_title_main = l['title'].split('\n')[0].strip()
            if js_title_main.replace('？','').replace('?','') == title.replace('？','').replace('?',''):
                l['vocab'] = vocab
                print(f"  -> Updated {target_grade}{target_sem} L{l['lesson']} vocab.")
                found = True
                break
        
        if not found:
            # Create new lesson entry
            # Need to format title "Title\n113學年度 | 一年級 | 國語 | 康軒版"
            new_title = f"{title}\n113學年度 | 一年級 | 國語 | 康軒版"
            new_entry = {
                "lesson": lesson_num,
                "title": new_title,
                "vocab": vocab
            }
            lesson_list.append(new_entry)
            # Sort by lesson
            lesson_list.sort(key=lambda x: x['lesson'])
            print(f"  -> Added new lesson {target_grade}{target_sem} L{lesson_num} {title}.")

    # Save back
    new_json_str = json.dumps(data, indent=2, ensure_ascii=False)
    # Reconstruct JS
    # Usually: window.CURRICULUM_KANGHSUAN = { ... };
    # Only replace the object part
    
    # We'll just overwrite efficiently
    output_content = f"// db_curriculum.js\n// 自動抓取自教育部教育百科 (學年度: 113)\n// Updated by Agent\n\nwindow.CURRICULUM_KANGHSUAN = {new_json_str};\n"
    
    with open(JS_FILE, 'w', encoding='utf-8') as f:
        f.write(output_content)
    
    print("Done.")

if __name__ == "__main__":
    main()
