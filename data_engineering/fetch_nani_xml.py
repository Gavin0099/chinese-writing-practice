import requests
from bs4 import BeautifulSoup
import os
import time
import re
import urllib3

# 忽略 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ================= 設定區 =================
LIST_URL_TEMPLATE = "https://pedia.cloud.edu.tw/Bookmark/Textword?year={year}_{sem}&degree={grade}&category=%E5%9C%8B%E8%AA%9E"
DETAIL_URL_TEMPLATE = "https://pedia.cloud.edu.tw/Bookmark/TCollection?TextNameId={id}"
EXPORT_URL = "https://pedia.cloud.edu.tw/Bookmark/Export"

# 建立 Session (就像打開瀏覽器，會自動處理 Cookie)
session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://pedia.cloud.edu.tw",
})

GRADE_MAP = {1: "一年級", 2: "二年級", 3: "三年級", 4: "四年級", 5: "五年級", 6: "六年級"}
SEM_MAP = {1: "上學期", 2: "下學期"}

def download_lesson(text_id, lesson_title, save_path):
    """
    二段式下載：
    1. GET 詳情頁 -> 拿 Token
    2. POST Export -> 下載檔案
    """
    detail_url = DETAIL_URL_TEMPLATE.format(id=text_id)
    
    try:
        # --- 第一步：進入詳情頁抓取 Token ---
        # print(f"      Login... (抓取 Token)", end="")
        resp_detail = session.get(detail_url, verify=False, timeout=10)
        soup = BeautifulSoup(resp_detail.text, 'html.parser')
        
        # 抓取 formExport 裡的 token
        form = soup.find('form', id='formExport')
        if not form:
            print(" -> ❌ 找不到表單", end="")
            return False
            
        token_input = form.find('input', attrs={'name': '__RequestVerificationToken'})
        if not token_input:
            print(" -> ❌ 找不到 Token", end="")
            return False
            
        token = token_input['value']
        
        # 順便抓取 strName (有些伺服器會檢查這個名稱是否匹配)
        str_name_input = form.find('input', attrs={'name': 'strName'})
        str_name = str_name_input['value'] if str_name_input else lesson_title

        # --- 第二步：偽造 POST 請求下載 ---
        # print(" -> POST 下載...", end="")
        
        payload = {
            "__RequestVerificationToken": token,
            "strName": str_name,
            "strShare": "",
            "textNameId": text_id,
            "isAllWords": "false",
            "createtype": "textbook",
            "s": "All"
        }
        
        # 記得帶 Referer，不然可能會被擋
        headers = {
            "Referer": detail_url,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        # 發送 POST
        resp_post = session.post(EXPORT_URL, data=payload, headers=headers, stream=True, verify=False)
        
        if resp_post.status_code == 200:
            # 檢查是不是下載到錯誤頁面
            if "text/html" in resp_post.headers.get("Content-Type", ""):
                print(" -> ❌ 失敗 (伺服器回傳 HTML)", end="")
                return False
                
            # 寫入檔案
            with open(save_path, 'wb') as f:
                for chunk in resp_post.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        else:
            print(f" -> ❌ HTTP {resp_post.status_code}", end="")
            return False

    except Exception as e:
        print(f" -> ❌ 錯誤: {e}", end="")
        return False

def process_grade(grade):
    print(f"\n📘 分析：{GRADE_MAP[grade]} (v12.0 最終完結版)...")
    
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
            resp = session.get(list_url, verify=False, timeout=10)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            table = soup.find('table')
            if not table:
                if year != "114":
                    print(f"   ⚠️  {sem_name} (Year {year}) 無資料表格")
                continue
                
            rows = table.find_all('tr')[1:]
            count = 0
            
            for row in rows:
                row_text = row.get_text()
                # 再次確認是南一版
                if "南一" not in row_text: continue
                
                target_td = row.find('td', class_='textname')
                
                if target_td and 'id' in target_td.attrs:
                    text_id = target_td['id']
                    
                    title_tag = target_td.find('strong')
                    if title_tag:
                        full_title = title_tag.get_text().strip()
                        safe_title = re.sub(r'[\\/*?:"<>|]', "", full_title)
                        
                        filename = f"{safe_title}.xml"
                        file_path = os.path.join(save_dir, filename)
                        
                        print(f"   [{sem_name}] ⬇️  {safe_title} (ID:{text_id})...", end="")
                        
                        # 呼叫二段式下載
                        if download_lesson(text_id, safe_title, file_path):
                            print(" 成功")
                            count += 1
                        else:
                            print(" 失敗")
                        
                        # 稍微休息一下，避免對伺服器太兇
                        time.sleep(0.5)

            if count > 0:
                print(f"   ✅  {sem_name} 共下載 {count} 課")

        except Exception as e:
            print(f"   ❌ 列表頁錯誤: {e}")

if __name__ == "__main__":
    print("🚀 開始執行 v12.0 (Token + POST 破解版)...")
    
    base_dir = os.path.join("data_engineering", "source_xmls", "南一")
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)

    for g in range(1, 7):
        process_grade(g)
        
    print("\n🎉 全部完成！恭喜！")