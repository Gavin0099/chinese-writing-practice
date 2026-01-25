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
    
    print(f"📥 正在抓取: {grade}年級 {'上' if semester==1 else '下'}學期 ({year_param})...")
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15, verify=False)
        if resp.status_code != 200:
            print(f"   ❌ 連線失敗: {resp.status_code}")
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
                    vocab_list = []
                    
                    # 拆解詞彙邏輯
                    parts = re.split(r"[,，\s、]+", content_text)
                    for part in parts:
                        part = part.strip()
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
            preview = current_lessons[0]['vocab'][:5]
            print(f"   ✅ 成功: {current_lessons[0]['title']} -> {preview}...")
        else:
            print(f"   ⚠️ 無資料")

        return current_lessons

    except Exception as e:
        print(f"   ❌ 程式錯誤: {e}")
        return []

# ================= 主程式執行 =================

full_structure = {}

print(f"🚀 開始爬取康軒版 {TARGET_YEAR} 學年度生字表 (Safe Write Mode)...")

for grade in range(1, 7): 
    full_structure[str(grade)] = {}
    
    # 上學期
    full_structure[str(grade)]["A"] = fetch_grade_data(grade, 1)
    time.sleep(0.3)
    
    # 下學期
    full_structure[str(grade)]["B"] = fetch_grade_data(grade, 2)
    time.sleep(0.3)

# ================= 輸出 (修正部分) =================

print("💾 正在寫入檔案...")

# 先將 JSON 轉為字串
json_str = json.dumps(full_structure, ensure_ascii=False, indent=2)
timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

# 使用傳統串接方式，避免 f-string 的大括號語法衝突
js_lines = []
js_lines.append("// db_curriculum.js")
js_lines.append("// 自動抓取自教育部教育百科 (學年度: " + TARGET_YEAR + ")")
js_lines.append("// 抓取時間: " + timestamp)
js_lines.append("")
js_lines.append("window.CURRICULUM_DATA = {")
js_lines.append('  "publisher": "KangHsuan",')
js_lines.append('  "version": "' + TARGET_YEAR + '_Academic_Year",')
js_lines.append('  "structure": ' + json_str)
js_lines.append("};")

# 組合並寫入
final_content = "\n".join(js_lines)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write(final_content)

print(f"\n🎉 完美修正！檔案已輸出至: {OUTPUT_FILE}")
print("請將此檔案放入 Web 根目錄並重新整理網頁。")