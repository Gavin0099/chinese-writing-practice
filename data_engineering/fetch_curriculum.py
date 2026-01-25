import requests
from bs4 import BeautifulSoup
import json
import time
import urllib3
import re

# ================= 設定區 =================
TARGET_YEAR = "113" 
OUTPUT_FILE = "db_curriculum.js"
BASE_URL = "https://pedia.cloud.edu.tw"

# 模擬瀏覽器
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# 忽略 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def clean_vocab_list(text_content):
    """
    共用的生字清洗邏輯：從文字串中提取單字
    """
    vocab_list = []
    # 移除干擾字
    text_content = text_content.replace("前往", "").replace("連結", "").replace("生字", "")
    
    # 分割與拆解
    parts = re.split(r"[,，\s、]+", text_content)
    for part in parts:
        part = part.strip()
        # 拆解每一個字
        for char in part:
            # 檢查漢字範圍 (4E00-9FFF)
            if '\u4e00' <= char <= '\u9fff':
                if char not in vocab_list:
                    vocab_list.append(char)
    return vocab_list

def fetch_lesson_detail(lesson_url, lesson_title):
    """
    [策略 A] 進入課程內頁抓取完整生字
    """
    try:
        if not lesson_url.startswith("http"):
            lesson_url = BASE_URL + lesson_url
            
        resp = requests.get(lesson_url, headers=HEADERS, timeout=10, verify=False)
        if resp.status_code != 200:
            return None # 回傳 None 表示失敗，觸發 Fallback
            
        soup = BeautifulSoup(resp.text, 'html.parser')
        vocab_list = []
        
        # 尋找內頁表格
        rows = soup.find_all('tr')
        found_data = False
        
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 2:
                category = cols[0].get_text().strip()
                content = cols[1].get_text().strip()
                
                # 抓取標記為「生字」的列
                if "生字" in category:
                    found_data = True
                    # 清洗並加入
                    chars = clean_vocab_list(content)
                    for c in chars:
                        if c not in vocab_list:
                            vocab_list.append(c)
        
        if not found_data:
            # 萬一內頁結構不一樣，嘗試直接抓所有漢字
            # print(f"      ⚠️ 內頁無標準表格，嘗試全文搜索...")
            return None 

        return vocab_list

    except Exception as e:
        # print(f"      ❌ 內頁錯誤: {e}")
        return None

def fetch_grade_data(grade, semester):
    year_param = f"{TARGET_YEAR}_{semester}"
    url = f"https://pedia.cloud.edu.tw/Bookmark/Textword?year={year_param}&degree={grade}&subject=%E5%9C%8B%E8%AA%9E%E6%96%87&press=%E5%BA%B7%E8%BB%92%E7%89%88"
    
    print(f"📥 正在分析: {grade}年級 {'上' if semester==1 else '下'}學期...")
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15, verify=False)
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
                    
                    # 取得最後一欄 (連結與預覽)
                    link_col = cols[-1]
                    
                    # [嘗試 1] 尋找任何超連結
                    link_tag = link_col.find('a', href=True)
                    
                    final_vocab = []
                    source_type = "未知"

                    # === 策略分支 ===
                    if link_tag:
                        # 嘗試深度爬取
                        detail_url = link_tag['href']
                        print(f"   👉 進入內頁: {lesson_title}...", end="\r")
                        
                        deep_vocab = fetch_lesson_detail(detail_url, lesson_title)
                        
                        if deep_vocab and len(deep_vocab) > 0:
                            final_vocab = deep_vocab
                            source_type = "深度 (完整)"
                        else:
                            # 深度爬取失敗，退回預覽文字
                            source_type = "預覽 (Fallback)"
                            final_vocab = clean_vocab_list(link_col.get_text())
                    else:
                        # 沒連結，直接抓預覽文字
                        source_type = "純文字"
                        final_vocab = clean_vocab_list(link_col.get_text())

                    # 存入資料
                    if final_vocab:
                        current_lessons.append({
                            "lesson": lesson_count,
                            "title": lesson_title,
                            "vocab": final_vocab
                        })
                        # 顯示進度
                        # print(f"   ✅ {lesson_title} [{source_type}]: {len(final_vocab)} 字")
                        lesson_count += 1
                    
                    time.sleep(0.1) 
        
        if len(current_lessons) > 0:
            print(f"   ✅ 完成！共 {len(current_lessons)} 課 | 範例: {current_lessons[0]['title']} ({len(current_lessons[0]['vocab'])}字)")
        else:
            print(f"   ⚠️ 無資料")
            
        return current_lessons

    except Exception as e:
        print(f"   ❌ 列表錯誤: {e}")
        return []

# ================= 主程式執行 =================

full_structure = {}
print(f"🚀 開始執行 v5.1 混合容錯版 ({TARGET_YEAR}學年度)...")

for grade in range(1, 7): 
    full_structure[str(grade)] = {}
    full_structure[str(grade)]["A"] = fetch_grade_data(grade, 1) # 上學期
    full_structure[str(grade)]["B"] = fetch_grade_data(grade, 2) # 下學期

# ================= 輸出 =================
print("\n💾 正在存檔...")

json_str = json.dumps(full_structure, ensure_ascii=False, indent=2)
timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

js_content = "// db_curriculum.js\n"
js_content += f"// 產生時間: {timestamp}\n"
js_content += "// 來源: 教育百科 (混合容錯模式)\n\n"
js_content += "window.CURRICULUM_DATA = {\n"
js_content += '  "publisher": "KangHsuan",\n'
js_content += f'  "version": "{TARGET_YEAR}_Academic_Year",\n'
js_content += f'  "structure": {json_str}\n'
js_content += "};\n"

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"🎉 成功！檔案已輸出至: {OUTPUT_FILE}")
print("請複製回專案資料夾。")