import requests
from bs4 import BeautifulSoup
import json
import re
import time
import urllib3

# ================= 設定區 =================
TARGET_YEAR = "113" 
OUTPUT_FILE = "db_curriculum.js"

# 模擬瀏覽器
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# 忽略 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def fetch_grade_data(grade, semester):
    year_param = f"{TARGET_YEAR}_{semester}"
    url = f"https://pedia.cloud.edu.tw/Bookmark/Textword?year={year_param}&degree={grade}&subject=%E5%9C%8B%E8%AA%9E%E6%96%87&press=%E5%BA%B7%E8%BB%92%E7%89%88"
    
    print(f"📥 正在抓取: {grade}年級 {'上' if semester==1 else '下'}學期...")
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15, verify=False)
        if resp.status_code != 200:
            return []
            
        soup = BeautifulSoup(resp.text, 'html.parser')
        current_lessons = []
        rows = soup.find_all('tr')
        lesson_count = 1
        
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 2:
                title_text = cols[0].get_text().strip()
                
                if "第" in title_text and "課" in title_text:
                    if "：" in title_text:
                        lesson_title = title_text.split("：")[-1].strip()
                    else:
                        lesson_title = title_text
                    
                    content_text = cols[-1].get_text().strip()
                    
                    # 1. 移除介面雜訊 (這是造成誤判的原因之一)
                    content_text = content_text.replace("前往", "").replace("連結", "")
                    
                    vocab_list = []
                    
                    # 2. 先依標點切割成「詞」
                    parts = re.split(r"[,，\s、]+", content_text)
                    for part in parts:
                        part = part.strip()
                        # 3. ★★★ 強制拆解每一個字 (花草 -> 花, 草) ★★★
                        for char in part:
                            if '\u4e00' <= char <= '\u9fff':
                                if char not in vocab_list:
                                    vocab_list.append(char)
                    
                    if vocab_list:
                        current_lessons.append({
                            "lesson": lesson_count,
                            "title": lesson_title,
                            "vocab": vocab_list
                        })
                        lesson_count += 1

        if len(current_lessons) > 0:
            # 印出前幾個字檢查，確保 "花" 和 "草" 都在裡面
            print(f"   ✅ {current_lessons[0]['title']}: {current_lessons[0]['vocab'][:8]}...")
        else:
            print(f"   ⚠️ 無資料")

        return current_lessons

    except Exception as e:
        print(f"   ❌ 錯誤: {e}")
        return []

# ================= 主程式執行 =================

full_structure = {}
print(f"🚀 開始執行 v4.0 終極拆字版 ({TARGET_YEAR}學年度)...")

for grade in range(1, 7): 
    full_structure[str(grade)] = {}
    full_structure[str(grade)]["A"] = fetch_grade_data(grade, 1) # 上學期
    time.sleep(0.2)
    full_structure[str(grade)]["B"] = fetch_grade_data(grade, 2) # 下學期
    time.sleep(0.2)

# ================= 輸出 =================
print("💾 正在存檔...")

# 使用最安全的字串拼接寫入
json_str = json.dumps(full_structure, ensure_ascii=False, indent=2)
timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

js_content = "// db_curriculum.js\n"
js_content += f"// 產生時間: {timestamp}\n"
js_content += "// 來源: 教育百科 (自動拆解詞彙模式)\n\n"
js_content += "window.CURRICULUM_DATA = {\n"
js_content += '  "publisher": "KangHsuan",\n'
js_content += f'  "version": "{TARGET_YEAR}_Academic_Year",\n'
js_content += f'  "structure": {json_str}\n'
js_content += "};\n"

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"\n🎉 完成！檔案已輸出至: {OUTPUT_FILE}")
print("👉 請執行: copy db_curriculum.js ..\\db_curriculum.js (或手動複製回 Web 資料夾)")