import requests
from bs4 import BeautifulSoup
import os
import time
import re
import urllib3

# 忽略 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ================= 設定區 =================
# v2.0 修正：使用 category=國語 (而非 subject=國語文)
LIST_URL_TEMPLATE = "https://pedia.cloud.edu.tw/Bookmark/Textword?year={year}_{sem}&degree={grade}&category=%E5%9C%8B%E8%AA%9E&press=%E5%8D%97%E4%B8%80%E7%89%88"
EXPORT_URL_TEMPLATE = "https://pedia.cloud.edu.tw/Bookmark/ExportTextword?textNameId={id}&format=Xml"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Referer": "https://pedia.cloud.edu.tw/Bookmark/Textword"
}

GRADE_MAP = {1: "一年級", 2: "二年級", 3: "三年級", 4: "四年級", 5: "五年級", 6: "六年級"}
SEM_MAP = {1: "上學期", 2: "下學期"}

def download_file(url, save_path):
    """下載單一檔案"""
    try:
        time.sleep(0.3) # 禮貌性延遲
        resp = requests.get(url, headers=HEADERS, stream=True, verify=False)
        if resp.status_code == 200:
            if "text/html" in resp.headers.get("Content-Type", ""):
                 # 如果伺服器回傳 HTML (例如錯誤頁面)，代表下載失敗
                return False
            
            with open(save_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        else:
            return False
    except Exception:
        return False

def process_grade(grade):
    print(f"\n📘 正在處理：{GRADE_MAP[grade]} (南一版)...")
    
    # 年份設定：上學期 114, 下學期 113
    semesters = [
        (1, "114"), 
        (2, "113")
    ]
    
    for sem_code, year in semesters:
        sem_name = SEM_MAP[sem_code]
        save_dir = os.path.join("data_engineering", "source_xmls", "南一", GRADE_MAP[grade], sem_name)
        
        if not os.path.exists(save_dir):
            os.makedirs(save_dir)
            
        # 產生列表網址
        list_url = LIST_URL_TEMPLATE.format(year=year, sem=sem_code, grade=grade)
        
        try:
            resp = requests.get(list_url, headers=HEADERS, verify=False, timeout=10)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # 尋找課程連結 (TextNameId)
            links = soup.find_all('a', href=re.compile(r"TextNameId="))
            
            count = 0
            found_titles = []

            for link in links:
                title = link.get_text().strip()
                # 簡單過濾：標題太長或不含"課"的通常不是課程
                if not title or len(title) > 30 or "課" not in title:
                    continue
                
                # 避免重複下載同一課 (有些網頁會有重複連結)
                if title in found_titles:
                    continue
                found_titles.append(title)

                href = link['href']
                match = re.search(r'TextNameId=([a-zA-Z0-9]+)', href)
                if match:
                    text_id = match.group(1)
                    xml_url = EXPORT_URL_TEMPLATE.format(id=text_id)
                    
                    # 處理檔名
                    safe_title = re.sub(r'[\\/*?:"<>|]', "", title)
                    filename = f"{safe_title}.xml"
                    file_path = os.path.join(save_dir, filename)
                    
                    # 顯示進度
                    print(f"   [{sem_name}] ⬇️  {title} ...", end="")
                    if download_file(xml_url, file_path):
                        print(" 成功")
                        count += 1
                    else:
                        print(" 失敗")
            
            if count == 0:
                print(f"   ⚠️  {sem_name} (Year {year}) 找不到資料。")
                print(f"      👉 檢查網址: {list_url}")

        except Exception as e:
            print(f"   ❌ 發生錯誤: {e}")

if __name__ == "__main__":
    print("🚀 開始下載南一版生字 XML (v2.0 修正參數版)...")
    
    base_dir = os.path.join("data_engineering", "source_xmls", "南一")
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)

    for g in range(1, 7):
        process_grade(g)
        
    print("\n🎉 全部完成！")