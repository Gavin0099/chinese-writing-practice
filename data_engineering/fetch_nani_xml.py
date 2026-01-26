import requests
from bs4 import BeautifulSoup
import os
import time
import re
import urllib3

# 忽略 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ================= 設定區 =================
# ★★★ 關鍵修正：加上 &press=翰林版 ★★★
LIST_URL_TEMPLATE = "https://pedia.cloud.edu.tw/Bookmark/Textword?year={year}_{sem}&degree={grade}&category=%E5%9C%8B%E8%AA%9E&press=%E7%BF%B0%E6%9E%97%E7%89%88"
DETAIL_URL_TEMPLATE = "https://pedia.cloud.edu.tw/Bookmark/TCollection?TextNameId={id}"
EXPORT_URL = "https://pedia.cloud.edu.tw/Bookmark/Export"

# 建立 Session
session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://pedia.cloud.edu.tw",
})

GRADE_MAP = {1: "一年級", 2: "二年級", 3: "三年級", 4: "四年級", 5: "五年級", 6: "六年級"}
SEM_MAP = {1: "上學期", 2: "下學期"}

def download_lesson(text_id, lesson_title, save_path):
    """
    核心下載邏輯 (CSRF Token + POST) - 與南一版完全相同
    """
    detail_url = DETAIL_URL_TEMPLATE.format(id=text_id)
    
    try:
        # 1. GET 詳情頁拿 Token
        resp_detail = session.get(detail_url, verify=False, timeout=10)
        soup = BeautifulSoup(resp_detail.text, 'html.parser')
        
        form = soup.find('form', id='formExport')
        if not form:
            print(" -> ❌ 找不到表單", end="")
            return False
            
        token_input = form.find('input', attrs={'name': '__RequestVerificationToken'})
        if not token_input:
            print(" -> ❌ 找不到 Token", end="")
            return False
            
        token = token_input['value']
        
        # 抓取 strName
        str_name_input = form.find('input', attrs={'name': 'strName'})
        str_name = str_name_input['value'] if str_name_input else lesson_title

        # 2. POST 提交表單下載
        payload = {
            "__RequestVerificationToken": token,
            "strName": str_name,
            "strShare": "",
            "textNameId": text_id,
            "isAllWords": "false",
            "createtype": "textbook",
            "s": "All"
        }
        
        headers = {
            "Referer": detail_url,
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        resp_post = session.post(EXPORT_URL, data=payload, headers=headers, stream=True, verify=False)
        
        if resp_post.status_code == 200:
            if "text/html" in resp_post.headers.get("Content-Type", ""):
                print(" -> ❌ 失敗 (HTML)", end="")
                return False
                
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
    print(f"\n📘 分析：{GRADE_MAP[grade]} (翰林版)...")
    
    semesters = [
        (1, "114"), 
        (2, "113")
    ]
    
    for sem_code, year in semesters:
        sem_name = SEM_MAP[sem_code]
        # 存檔路徑
        save_dir = os.path.join("data_engineering", "source_xmls", "翰林", GRADE_MAP[grade], sem_name)
        
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
                
                # 這次我們只過濾「翰林」
                if "翰林" not in row_text: 
                    continue
                
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
                        
                        if download_lesson(text_id, safe_title, file_path):
                            print(" 成功")
                            count += 1
                        else:
                            print(" 失敗")
                        
                        time.sleep(0.5)

            if count > 0:
                print(f"   ✅  {sem_name} 共下載 {count} 課")
            elif year == "114" and sem_code == 1:
                # 如果 114 上學期還是抓不到，可能是網站還沒上架翰林版的 114 資料
                print(f"   ⚠️  {sem_name} (Year {year}) 翰林版可能尚未更新資料")

        except Exception as e:
            print(f"   ❌ 列表頁錯誤: {e}")

if __name__ == "__main__":
    print("🚀 開始下載翰林版生字 XML (v2.0 修正參數版)...")
    
    base_dir = os.path.join("data_engineering", "source_xmls", "翰林")
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)

    for g in range(1, 7):
        process_grade(g)
        
    print("\n🎉 翰林版全部完成！")