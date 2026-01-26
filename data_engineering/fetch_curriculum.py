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

# 更加完整的瀏覽器偽裝
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Referer": "https://pedia.cloud.edu.tw/Bookmark/Textword", # 關鍵：告訴伺服器我們是從這裡來的
    "Connection": "keep-alive"
}
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def fetch_inner_page_vocab(url, title):
    """
    爬取內頁表格 (加入 Referer 偽裝)
    """
    try:
        if not url.startswith("http"):
            url = BASE_URL + url

        # 隨機延遲，模擬人類點擊
        time.sleep(0.3)
        
        resp = requests.get(url, headers=HEADERS, timeout=10, verify=False)
        if resp.status_code != 200:
            print(f"      ❌ 拒絕存取: {resp.status_code}")
            return []

        soup = BeautifulSoup(resp.text, 'html.parser')
        vocab = []
        
        # 策略：暴力搜尋所有含有「生字」文字的欄位
        # 不管表格結構怎麼變，只要看到「生字」，就抓它隔壁那一格
        tags = soup.find_all(string=re.compile("生字"))
        
        for tag in tags:
            # tag 只是文字節點，parent 才是 <td>
            td = tag.parent
            if td.name == 'td':
                # 找下一個兄弟欄位
                next_td = td.find_next_sibling('td')
                if next_td:
                    raw_text = next_td.get_text().strip()
                    # 清洗：只留漢字
                    clean_char = re.sub(r'[^\u4e00-\u9fff]', '', raw_text)
                    
                    if len(clean_char) == 1 and clean_char not in vocab:
                        vocab.append(clean_char)
        
        return vocab

    except Exception as e:
        print(f"      ❌ 解析錯誤: {e}")
        return []

def fetch_grade_data(grade, semester):
    year_param = f"{TARGET_YEAR}_{semester}"
    url = f"https://pedia.cloud.edu.tw/Bookmark/Textword?year={year_param}&degree={grade}&subject=%E5%9C%8B%E8%AA%9E%E6%96%87&press=%E5%BA%B7%E8%BB%92%E7%89%88"
    
    print(f"📥 分析目錄: {grade}年級 {'上' if semester==1 else '下'}學期...")
    
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
                    lesson_title = title_text.split("：")[-1].strip().split('\n')[0]
                    link_col = cols[-1]
                    link_tag = link_col.find('a', href=True)
                    
                    final_vocab = []
                    
                    if link_tag:
                        detail_url = link_tag['href']
                        print(f"   👉 [{lesson_count}] {lesson_title}...", end="\r")
                        
                        # 嘗試進入內頁
                        deep_vocab = fetch_inner_page_vocab(detail_url, lesson_title)
                        
                        if deep_vocab:
                            final_vocab = deep_vocab
                        else:
                            # 內頁失敗，使用備用文字 (這次會濾掉干擾字)
                            preview_text = link_col.get_text()
                            # 濾掉 "前往", "連結"
                            preview_text = preview_text.replace("前往", "").replace("連結", "")
                            parts = re.split(r"[,，\s、]+", preview_text)
                            for p in parts:
                                for c in p:
                                    if '\u4e00' <= c <= '\u9fff' and c not in final_vocab:
                                        final_vocab.append(c)
                    
                    if final_vocab:
                        current_lessons.append({
                            "lesson": lesson_count,
                            "title": lesson_title,
                            "vocab": final_vocab
                        })
                        lesson_count += 1

        if current_lessons:
            first = current_lessons[0]
            print(f"   ✅ 成功 {len(current_lessons)} 課 | L1範例: {first['vocab']}")
        else:
            print(f"   ⚠️ 無資料")
            
        return current_lessons

    except Exception as e:
        print(f"   ❌ 列表錯誤: {e}")
        return []

# ================= 主程式執行 =================

full_structure = {}
print(f"🚀 開始執行 v8.0 瀏覽器偽裝版 ({TARGET_YEAR}學年度)...")

# 為了節省您的時間，我們只跑 1~6 年級，請耐心等待全部跑完
for grade in range(1, 7): 
    full_structure[str(grade)] = {}
    full_structure[str(grade)]["A"] = fetch_grade_data(grade, 1) 
    full_structure[str(grade)]["B"] = fetch_grade_data(grade, 2) 

# ================= 輸出 =================
print("\n💾 正在存檔...")

json_str = json.dumps(full_structure, ensure_ascii=False, indent=2)
timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

js_content = "// db_curriculum.js\n"
js_content += f"// 產生時間: {timestamp}\n"
js_content += "// 來源: 教育百科 (Headers 偽裝模式)\n\n"
js_content += "window.CURRICULUM_DATA = {\n"
js_content += '  "publisher": "KangHsuan",\n'
js_content += f'  "version": "{TARGET_YEAR}_Academic_Year",\n'
js_content += f'  "structure": {json_str}\n'
js_content += "};\n"

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"🎉 成功！檔案已輸出至: {OUTPUT_FILE}")
print("請再次檢查 L1 生字，這次應該不會有「前往」了！")