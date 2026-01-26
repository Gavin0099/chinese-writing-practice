import requests
from bs4 import BeautifulSoup
import os
import time
import re
import urllib3

# 忽略 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ================= 設定區 =================
BASE_URL = "https://pedia.cloud.edu.tw"
LIST_URL_TEMPLATE = "https://pedia.cloud.edu.tw/Bookmark/Textword?year={year}_{sem}&degree={grade}&subject=%E5%9C%8B%E8%AA%9E%E6%96%87&press=%E5%8D%97%E4%B8%80%E7%89%88"
# 匯出 XML 的 API 格式
EXPORT_URL_TEMPLATE = "https://pedia.cloud.edu.tw/Bookmark/ExportTextword?textNameId={id}&format=Xml"

# 偽裝瀏覽器
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Referer": "https://pedia.cloud.edu.tw/Bookmark/Textword"
}

# 數字轉中文年級
GRADE_MAP = {1: "一年級", 2: "二年級", 3: "三年級", 4: "四年級", 5: "五年級", 6: "六年級"}
SEM_MAP = {1: "上學期", 2: "下學期"}

def download_file(url, save_path):
    """下載單一檔案"""
    try:
        # 隨機延遲，避免對伺服器造成負擔
        time.sleep(0.5)
        resp = requests.get(url, headers=HEADERS, stream=True, verify=False)
        if resp.status_code == 200:
            with open(save_path, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        else:
            print(f"      ❌ 下載失敗 (Status: {resp.status_code})")
            return False
    except Exception as e:
        print(f"      ❌ 錯誤: {e}")
        return False

def process_grade(grade):
    """處理單一年級的上下學期"""
    print(f"\n📘 正在處理：{GRADE_MAP[grade]} (南一版)...")
    
    # 依照您的需求設定年份：上學期用 114, 下學期用 113
    semesters = [
        (1, "114"), 
        (2, "113")
    ]
    
    for sem_code, year in semesters:
        sem_name = SEM_MAP[sem_code]
        # 建立存檔目錄：data_engineering/source_xmls/南一/X年級/X學期
        save_dir = os.path.join("data_engineering", "source_xmls", "南一", GRADE_MAP[grade], sem_name)
        if not os.path.exists(save_dir):
            os.makedirs(save_dir)
            
        print(f"   📂 準備目錄: {save_dir}")
        
        # 1. 抓取該學期的課程列表
        list_url = LIST_URL_TEMPLATE.format(year=year, sem=sem_code, grade=grade)
        print(f"   🔍 讀取課表 (Year {year}-{sem_code}): {list_url}")
        
        try:
            resp = requests.get(list_url, headers=HEADERS, verify=False, timeout=10)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # 尋找所有課程連結
            # 通常連結格式為 /Bookmark/TCollection?TextNameId=...
            links = soup.find_all('a', href=re.compile(r"TextNameId="))
            
            count = 0
            for link in links:
                # 取得課名
                title = link.get_text().strip()
                # 排除非課程的連結（有時候會有一些雜訊，這裡簡單判斷長度或關鍵字）
                if not title or len(title) > 20 or "課" not in title:
                    # 有些連結是課名，有些是按鈕，嘗試過濾
                    # 若包含"第"和"課"通常是正確的
                    if "第" not in title: 
                        continue

                # 解析 ID
                href = link['href']
                match = re.search(r'TextNameId=([a-zA-Z0-9]+)', href)
                if match:
                    text_id = match.group(1)
                    
                    # 2. 構建 XML 下載連結
                    xml_url = EXPORT_URL_TEMPLATE.format(id=text_id)
                    
                    # 處理檔名 (移除特殊字元避免檔名錯誤)
                    safe_title = re.sub(r'[\\/*?:"<>|]', "", title)
                    filename = f"{safe_title}.xml"
                    file_path = os.path.join(save_dir, filename)
                    
                    # 3. 下載
                    print(f"      ⬇️ 下載 [{title}] ...", end="")
                    if download_file(xml_url, file_path):
                        print(" 完成")
                        count += 1
                    else:
                        print(" 失敗")
            
            if count == 0:
                print("      ⚠️ 警告：本學期找不到任何課程連結 (可能年份 114 還沒資料?)")

        except Exception as e:
            print(f"   ❌ 讀取列表失敗: {e}")

# ================= 主程式 =================
if __name__ == "__main__":
    print("🚀 開始下載南一版生字 XML (年份: 上114 / 下113)...")
    
    # 確保基礎目錄存在
    base_dir = os.path.join("data_engineering", "source_xmls", "南一")
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)

    # 執行 1~6 年級
    for g in range(1, 7):
        process_grade(g)
        
    print("\n🎉 全部完成！請檢查 data_engineering/source_xmls/南一 資料夾。")