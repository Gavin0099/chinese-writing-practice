import os
import json
import re
import shutil
import glob
import xml.etree.ElementTree as ET

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JS_FILE = os.path.join(BASE_DIR, "..", "curriculum_data.js")
SOURCE_ROOT = os.path.join(BASE_DIR, "source_xmls", "康軒")

def load_curriculum_map(filepath):
    """
    Returns:
      1. file_map: { "Title": {"grade": "一年級", "sem": "上學期", "lesson": 1} }
      2. expected_inventory: { "一年級_上學期": [list of titles], ... }
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match = re.search(r"window\.CURRICULUM_KANGHSUAN\s*=\s*(\{.*?\})\s*;?$", content, re.DOTALL)
    file_map = {}
    inventory = {}
    
    if match:
        try:
            data = json.loads(match.group(1))
            structure = data.get("structure", {})
            for grade, semesters in structure.items():
                grade_name = "一年級" if str(grade) == "1" else \
                             "二年級" if str(grade) == "2" else \
                             "三年級" if str(grade) == "3" else \
                             "四年級" if str(grade) == "4" else \
                             "五年級" if str(grade) == "5" else \
                             "六年級" if str(grade) == "6" else f"{grade}年級"
                
                for sem, lessons in semesters.items():
                    sem_name = "上學期" if sem == "A" else "下學期"
                    inv_key = f"{grade_name}_{sem_name}"
                    if inv_key not in inventory: inventory[inv_key] = []
                    
                    for l in lessons:
                        raw_title = l.get("title", "")
                        clean_title = raw_title.split("\n")[0].strip()
                        lesson_num = l.get("lesson")
                        
                        info = {
                            "grade": grade_name,
                            "sem": sem_name,
                            "lesson": lesson_num,
                            "title": clean_title,
                            "found": False
                        }
                        
                        # Inventory
                        inventory[inv_key].append(info)
                        
                        # Map for lookup (robust keys)
                        file_map[clean_title] = info
                        file_map[clean_title.replace("？", "").replace("?", "")] = info
                        # Also map "Title_L#" just in case? No, title is unique enough usually.

        except Exception as e:
            print(f"Error parsing JS JSON: {e}")
            
    return file_map, inventory

def parse_xml_title(filepath):
    try:
        tree = ET.parse(filepath)
        root = tree.getroot()
        name_tag = root.find(".//INFO/NAME")
        if name_tag is None: return None
        full_title = name_tag.text
        if "：" in full_title:
             return full_title.split("：", 1)[1].strip()
        else:
             return full_title.strip()
    except:
        return None

def main():
    print("Building Curriculum Map...")
    file_map, inventory = load_curriculum_map(JS_FILE)
    
    # Files to process: All XMLs in source_xmls (recursive)
    # They might be in source_xmls/康軒/一年級/file.xml or root
    search_path = os.path.join(SOURCE_ROOT, "**", "*.xml")
    xml_files = glob.glob(search_path, recursive=True)
    
    # If starting from fresh root (re-run), also check Base Dir artifacts
    temp_search = glob.glob(os.path.join(BASE_DIR, "*.xml"))
    xml_files.extend(temp_search)
    
    xml_files = list(set(xml_files)) # Dedupe names
    print(f"Found {len(xml_files)} XML files.")

    moved_count = 0
    
    for xml_path in xml_files:
        filename = os.path.basename(xml_path)
        title = parse_xml_title(xml_path)
        
        if not title: continue
        
        # Lookup
        meta = file_map.get(title)
        if not meta:
            meta = file_map.get(title.replace("？", "").replace("?", ""))
            
        if not meta:
            print(f"⚠️ Unmapped (Unknown Lesson): {title}")
            continue
            
        # Mark found in inventory
        # We need to find the specific object reference in inventory to mark it found
        # Doing a linear search in the specific bucket is safer
        inv_key = f"{meta['grade']}_{meta['sem']}"
        if inv_key in inventory:
            for item in inventory[inv_key]:
                if item['title'] == meta['title']: # exact match from DB logic
                    item['found'] = True
                    break

        # Move File
        # Target: source_xmls/康軒/{Grade}/{Sem}/
        target_dir = os.path.join(SOURCE_ROOT, meta['grade'], meta['sem'])
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
            
        dest_path = os.path.join(target_dir, filename)
        
        # Check if already there
        if os.path.abspath(xml_path) == os.path.abspath(dest_path):
            continue
            
        try:
            shutil.move(xml_path, dest_path)
            moved_count += 1
        except Exception as e:
            print(f"Move failed for {filename}: {e}")

    print(f"Moved {moved_count} files.")
    
    # Audit Report
    print("\n" + "="*30)
    print("      MISSING FILES REPORT      ")
    print("="*30)
    
    missing_total = 0
    # Process Order: 1A, 1B, 2A, 2B...
    sorted_keys = sorted(inventory.keys()) 
    
    for key in sorted_keys:
        items = inventory[key]
        missing_list = [i for i in items if not i['found']]
        
        if missing_list:
            print(f"\n[{key}] 缺漏 {len(missing_list)} 課:")
            missing_total += len(missing_list)
            for m in missing_list:
                print(f"  - 第 {m['lesson']} 課: {m['title']}")
        else:
            print(f"\n[{key}] ✅ 完整無缺 ({len(items)}/{len(items)})")

    if missing_total == 0:
        print("\n🎉 恭喜！所有課程檔案皆齊全！")
    else:
        print(f"\n⚠️ 總計缺漏: {missing_total} 個檔案")

if __name__ == "__main__":
    main()
