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
    # Look for window.CURRICULUM_KANGHSUAN = { ... };
    # Relaxed regex: remove anchor to end of file '$' to allow wrapper code
    match = re.search(r"window\.CURRICULUM_KANGHSUAN\s*=\s*(\{.*?\});", content, re.DOTALL)
    
    if match:
        json_str = match.group(1)
        try:
            data = json.loads(json_str)
            return data, content
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            # Fallback to fresh structure
    
    print("Warning: Could not parse existing JS. Starting with fresh structure.")
    return {
      "publisher": "KangHsuan",
      "version": "113_Academic_Year", 
      "structure": {}
    }, content

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

    # Process XMLs recursively
    # Search e.g. source_xmls/康軒/一年級/*.xml
    search_path = os.path.join(BASE_DIR, "**", "*.xml")
    xml_files = glob.glob(search_path, recursive=True)
    print(f"Found {len(xml_files)} XML files.")
    
    # Existing heuristics preserved for Grade 1
    known_1b_titles = [
        "看", "花園裡有什麼？", "花園裡有什麼", "媽媽的音樂會", "鞋", 
        "小種子快長大", "奶奶的小跟班", "作夢的雲", "妹妹的紅雨鞋", 
        "七彩的虹", "和你在一起", "生日快樂", "小黑"
    ]
    # Heuristics for Grade 2
    # 2A: 新學年新希望, 一起做早餐, 走過小巷, 運動會, 水上木偶戲, 小鎮的柿餅節, 國王的新衣裳, 「聰明」的小熊, 大象有多重, 我愛冬天, 遠方來的黑皮, 新年快樂
    known_2a_titles = [
        "新學年新希望", "一起做早餐", "走過小巷", "運動會", "水上木偶戲",
        "小鎮的柿餅節", "國王的新衣裳", "聰明的小熊", "「聰明」的小熊", "大象有多重", "大象有多重?",
        "我愛冬天", "遠方來的黑皮", "新年快樂"
    ]

    for xml_path in xml_files:
        info = parse_xml(xml_path)
        if not info:
            continue
            
        lesson_num = info['lesson']
        title = info['title']
        vocab = info['vocab']
        
    for xml_path in xml_files:
        info = parse_xml(xml_path)
        if not info:
            continue
            
        lesson_num = info['lesson']
        title = info['title']
        vocab = info['vocab']
        
        # 1. Determine Grade from Path
        # Default to 1 if not found
        target_grade = "1"
        if "六年級" in xml_path: target_grade = "6"
        elif "五年級" in xml_path: target_grade = "5"
        elif "四年級" in xml_path: target_grade = "4"
        elif "三年級" in xml_path: target_grade = "3"
        elif "二年級" in xml_path: target_grade = "2"
        elif "一年級" in xml_path: target_grade = "1"
        
        # 2. Determine Semester from Path
        # Default to A if not found (or based on heuristics if really needed, but folders prefered)
        target_sem = "A"
        if "下學期" in xml_path:
            target_sem = "B"
        elif "上學期" in xml_path:
            target_sem = "A"
        else:
            # Fallback for unorganized files (heuristic)
            clean_title = title.replace('？','').replace('?','')
            # Simple check for known 1B titles if still in root (legacy)
            if target_grade == "1":
                for kto in known_1b_titles:
                    if kto in clean_title:
                         target_sem = "B"
                         break
            elif target_grade == "2":
                 # If in root, assume 2A unless explicit
                 pass

        print(f"Processing: [{target_grade}{target_sem}] L{lesson_num} {title} ({len(vocab)} chars)")
        
        # Access Data
        if target_grade not in data["structure"]:
            data["structure"][target_grade] = {"A": [], "B": []}
            
        lesson_list = data["structure"][target_grade][target_sem]
        
        # Find existing lesson
        found = False
        for l in lesson_list:
            # Check Title Match (Punctuation relaxed)
            js_title_main = l['title'].split('\n')[0].strip()
            # Normalize comparison
            t1 = js_title_main.replace('？','').replace('?','')
            t2 = title.replace('？','').replace('?','')
            
            if t1 == t2 or (t1 in t2 and abs(len(t1)-len(t2)) < 3):
                l['vocab'] = vocab
                # Ensure Lesson Number matches what we found in XML if consistent?
                # Sometimes XML says Lesson 7 but DB thinks 8? trusting XML lesson num?
                # Usually stick to title match.
                print(f"  -> Updated {target_grade}{target_sem} L{l['lesson']} vocab.")
                found = True
                break
        
        if not found:
            # Create new lesson entry
            new_title = f"{title}\n113學年度 | {target_grade}年級 | 國語 | 康軒版"
            new_entry = {
                "lesson": lesson_num,
                "title": new_title,
                "vocab": vocab
            }
            lesson_list.append(new_entry)
            print(f"  -> Added new lesson {target_grade}{target_sem} L{lesson_num} {title}.")
            
    # Post-Loop: Sort all lists by lesson number
    for g_key in data["structure"]:
        for s_key in ["A", "B"]:
            if s_key in data["structure"][g_key]:
                data["structure"][g_key][s_key].sort(key=lambda x: x['lesson'])

    # Save back
    new_json_str = json.dumps(data, indent=2, ensure_ascii=False)
    # Reconstruct JS
    # Usually: window.CURRICULUM_KANGHSUAN = { ... };
    # Only replace the object part
    
    # We'll just overwrite efficiently
    output_content = f"// db_curriculum.js\n// 自動抓取自教育部教育百科 (學年度: 113)\n// Updated by Agent\n\nwindow.CURRICULUM_KANGHSUAN = {new_json_str};\n\n// Wrapper for compatibility\nwindow.CURRICULUM_DATA = window.CURRICULUM_KANGHSUAN.structure;\n"
    
    with open(JS_FILE, 'w', encoding='utf-8') as f:
        f.write(output_content)
    
    print("Done.")

if __name__ == "__main__":
    main()
