import requests
from bs4 import BeautifulSoup
import os
import time
import re
import urllib3

# 忽略 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ================= 設定區 =================
# 策略：抓取分類為「國語」的所有資料，再從內容過濾
LIST_URL_TEMPLATE = "https://pedia.cloud.edu.tw/Bookmark/Textword?year={year}_{sem}&degree={grade}&category=%E5%9C%8B%E8%AA%9E"
EXPORT_URL_TEMPLATE = "https://pedia.cloud.edu.tw/Bookmark/ExportTextword?textNameId={id}&format=Xml"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Referer": "https://pedia.cloud.edu.tw/Bookmark/Textword"
}

GRADE_MAP = {1: "一年級", 2: "二年級", 3: "三年級", 4: "四年級", 5: "五年級", 6: "六年級"}
SEM_MAP = {1: "上學期", 2: "下學期"}

def download_file(url, save_path):
    try:
        time.sleep(0.2)
        resp = requests.get(url, headers=HEADERS, stream=True, verify=False)
        if resp.status_code == 200:
            if "text/html" in resp.headers.get("Content-Type", ""):
                return False
            with open(save_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        return False
    except:
        return False

def process_grade(grade):
    print(f"\n📘 分析：{GRADE_MAP[grade]} (v6.0 最終版)...")
    
    # 依照您的需求：上學期抓 114, 下學期抓 113
    semesters = [
        (1, "114"), 
        (2, "113")
    ]
    
    for sem_code, year in semesters:
        sem_name = SEM_MAP[sem_code]
        save_dir = os.path.join("data_engineering", "source_xmls", "南一", GRADE_MAP[grade], sem_name)
        
        if not os.path.exists(save_dir):
            os.makedirs(save_dir)
            
        list_url = LIST_URL_TEMPLATE.format(year=year, sem=sem_code, grade=grade)
        
        try:
            resp = requests.get(list_url, headers=HEADERS, verify=False, timeout=10)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            table = soup.find('table')
            if not table:
                # 若 114 沒資料是正常的，不報錯
                if year != "114":
                    print(f"   ⚠️  {sem_name} (Year {year}) 無資料表格")
                continue
                
            rows = table.find_all('tr')[1:] # 跳過標題
            count = 0
            
            for row in rows:
                cols = row.find_all('td')
                if len(cols) < 2: continue # 至少要有 課名 和 連結 兩欄
                
                # ★★★ v6.0 修正：全部資訊都在第一欄 ★★★
                full_info = cols[0].get_text().strip()
                
                # 檢查是否為南一版
                if "南一" in full_info:
                    # 抓取課名 (通常在第一行，或用 \n 分隔)
                    # 例如: "第一課：太陽是充電機\n113學年度..."
                    title_part = full_info.split('\n')[0].strip()
                    
                    # 連結在第二欄
                    link_col = cols[1]
                    link = link_col.find('a', href=True)
                    
                    if link:
                        href = link['href']
                        match = re.search(r'TextNameId=([a-zA-Z0-9]+)', href)
                        
                        if match:
                            text_id = match.group(1)
                            xml_url = EXPORT_URL_TEMPLATE.format(id=text_id)
                            
                            safe_title = re.sub(r'[\\/*?:"<>|]', "", title_part)
                            filename = f"{safe_title}.xml"
                            file_path = os.path.join(save_dir, filename)
                            
                            print(f"   [{sem_name}] ⬇️  {safe_title}...", end="")
                            if download_file(xml_url, file_path):
                                print(" 成功")
                                count += 1
                            else:
                                print(" 失敗")
            
            if count == 0:
                 # 114 上學期如果是空的，我們不顯示警告，因為可能真的還沒出
                if year != "114":
                    print(f"   ⚠️  {sem_name} (Year {year}) 列表中沒發現南一版資料")
            else:
                print(f"   ✅  {sem_name} 共下載 {count} 課")

        except Exception as e:
            print(f"   ❌ 錯誤: {e}")

if __name__ == "__main__":
    print("🚀 開始執行 v6.0 (混合表格適配版)...")
    
    base_dir = os.path.join("data_engineering", "source_xmls", "南一")
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)

    for g in range(1, 7):
        process_grade(g)
        
    print("\n🎉 全部完成！")