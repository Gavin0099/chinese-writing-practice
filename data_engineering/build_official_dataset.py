import pandas as pd
import json
import requests
import os
import datetime
import hashlib
import re

# =================CONFIGURATION=================
BASE_DIR = r"e:\BackUp\GridGen\chinese-writing-practice\data_engineering"
SOURCES_DIR = os.path.join(BASE_DIR, "sources")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

SOURCE_SCOPE_FILE = "source_4808.csv"
SOURCE_SCOPE_PATH = os.path.join(BASE_DIR, SOURCE_SCOPE_FILE)

# URLs
SCOPE_URLS = [
    "https://raw.githubusercontent.com/ButTaiwan/cjktables/master/taiwan/standard/edu_standard_1.txt",
    "https://raw.githubusercontent.com/NightFurySL2001/cjktables/master/taiwan/standard/edu_standard_1.txt",
]
DICT_FILENAME = "dict-csld.json"
DICT_URL = "https://raw.githubusercontent.com/g0v/moedict-data-csld/master/dict-csld.json"
DICT_PATH = os.path.join(SOURCES_DIR, DICT_FILENAME)

# =================HELPER FUNCTIONS=================

def is_chinese_char(s):
    """
    Checks if a string is a single CJK character.
    Range: U+4E00 - U+9FFF (Common CJK)
    """
    if len(s) != 1:
        return False
    cp = ord(s)
    return 0x4E00 <= cp <= 0x9FFF

def clean_scope_line(line):
    line = line.strip()
    # Skip comments or empty lines
    if not line or line.startswith('#') or line.lower().startswith('unicode'):
        return None
    
    parts = line.split()
    
    # INTELLIGENT FINDER: Look for the Chinese char in the parts
    for part in parts:
        # Clean potential BOM or quotes
        clean_part = part.strip('"').strip("'").strip()
        if is_chinese_char(clean_part):
            return clean_part
            
    return None

def download_with_fallback(urls, filepath):
    print(f"⬇️ Attempting to download scope list (Smart Parse)...")
    for url in urls:
        try:
            print(f"   Trying: {url} ...")
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                raw_lines = resp.text.splitlines()
                clean_chars = []
                
                for line in raw_lines:
                    char = clean_scope_line(line)
                    if char: 
                        clean_chars.append(char)
                
                if len(clean_chars) < 100:
                    print(f"   ⚠️ Only found {len(clean_chars)} valid chars. This seems wrong. Skipping this source.")
                    continue

                # SAVE
                df = pd.DataFrame(clean_chars, columns=['常用字'])
                df.to_csv(filepath, index=False, encoding='utf-8-sig')
                print(f"✅ Success! Parsed {len(clean_chars)} Chinese characters.")
                return True
        except Exception as e:
            print(f"   ❌ Error: {e}")
    return False

def download_file(url, filepath):
    if os.path.exists(filepath):
        print(f"📦 Found dictionary: {filepath}")
        return
    print(f"⬇️ Downloading dictionary...")
    resp = requests.get(url, timeout=30)
    with open(filepath, 'wb') as f:
        f.write(resp.content)
    print("✅ Dictionary downloaded.")

def get_file_hash(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for b in iter(lambda: f.read(4096), b""): h.update(b)
    return h.hexdigest()

# =================MAIN ETL PROCESS=================

def main():
    os.makedirs(SOURCES_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("🚀 Starting Data Build (v1.7 Smart Parse)...")

    # 1. Dictionary
    try:
        download_file(DICT_URL, DICT_PATH)
        dict_hash = get_file_hash(DICT_PATH)
        print("📖 Parsing Dictionary...")
        with open(DICT_PATH, 'r', encoding='utf-8') as f:
            moe_dict = json.load(f)
        print(f"✅ Loaded {len(moe_dict)} entries.")
    except Exception as e:
        print(f"❌ Error loading dictionary: {e}")
        return

    # 2. Scope List
    if not download_with_fallback(SCOPE_URLS, SOURCE_SCOPE_PATH):
        print("❌ CRITICAL: Scope download failed.")
        return

    try:
        print(f"📄 Loading Scope from: {SOURCE_SCOPE_PATH}")
        df_scope = pd.read_csv(SOURCE_SCOPE_PATH, encoding='utf-8') 
        
        target_col = df_scope.columns[0]
        char_list = df_scope[target_col].dropna().unique().tolist()
        char_list = [str(c).strip() for c in char_list]
        print(f"🔢 Scope Size: {len(char_list)}")
        
    except Exception as e:
        print(f"❌ Failed to read scope file: {e}")
        return

    # 3. Indexing
    print("⚙️ Indexing Dictionary...")
    dict_lookup = {entry['title']: entry for entry in moe_dict}

    # === DIAGNOSTIC START ===
    print("\n🔍 DIAGNOSTIC CHECK:")
    # Should now show ['一', '乙', '丁'...]
    print(f"   Sample Scope Chars: {char_list[:5]}")
    sample_key = char_list[0]
    is_found = sample_key in dict_lookup
    print(f"   Testing match for '{sample_key}': {'FOUND ✅' if is_found else 'NOT FOUND ❌'}")
    print("="*30 + "\n")
    # === DIAGNOSTIC END ===

    # 4. Join
    print("🔄 Performing Join...")
    char_core = {}
    anomalies = {}
    
    for char in char_list:
        if char not in dict_lookup:
            anomalies[char] = {"reason": "Not found"}
            continue
            
        entry = dict_lookup[char]
        zhuyin_list = []
        if 'heteronyms' in entry:
            for h in entry['heteronyms']:
                if 'bopomofo' in h and h['bopomofo']:
                    z = h['bopomofo'].strip()
                    if z not in zhuyin_list: zhuyin_list.append(z)
        
        radical = entry.get('radical', '').strip()
        strokes = entry.get('stroke_count', 0)
        
        # Validation
        if zhuyin_list and radical and isinstance(strokes, int) and strokes > 0:
            char_core[char] = {
                "zhuyin": zhuyin_list,
                "radical": radical,
                "totalStrokes": strokes,
                "charForm": "正體"
            }
        else:
            anomalies[char] = {"reason": "Missing fields"}

    # 5. Output
    print("💾 Saving Files...")
    with open(os.path.join(OUTPUT_DIR, 'char_set_4808.json'), 'w', encoding='utf-8') as f:
        json.dump(char_list, f, ensure_ascii=False)
    with open(os.path.join(OUTPUT_DIR, 'char_core_4808.json'), 'w', encoding='utf-8') as f:
        json.dump(char_core, f, ensure_ascii=False, indent=2)
    with open(os.path.join(OUTPUT_DIR, 'anomalies.json'), 'w', encoding='utf-8') as f:
        json.dump(anomalies, f, ensure_ascii=False, indent=2)
    
    meta = {
        "datasetName": "MOE Standard Core",
        "generatedAt": datetime.datetime.now().isoformat(),
        "stats": {"success": len(char_core), "anomalies": len(anomalies)},
        "sources": {"dict_hash": dict_hash}
    }
    with open(os.path.join(OUTPUT_DIR, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"\n✅ DONE! Success: {len(char_core)} | Anomalies: {len(anomalies)}")
    print(f"Check: {os.path.join(OUTPUT_DIR, 'char_core_4808.json')}")

if __name__ == "__main__":
    main()