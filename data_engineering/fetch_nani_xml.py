import requests
from bs4 import BeautifulSoup
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 我們只測試「一年級 下學期 (113_2)」，因為這學期資料一定最完整
TARGET_URL = "https://pedia.cloud.edu.tw/Bookmark/Textword?year=113_2&degree=1&category=%E5%9C%8B%E8%AA%9E"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Referer": "https://pedia.cloud.edu.tw/Bookmark/Textword"
}

def inspect_page():
    print(f"🕵️ 正在診斷網頁: {TARGET_URL}")
    print("-" * 50)
    
    try:
        resp = requests.get(TARGET_URL, headers=HEADERS, verify=False, timeout=10)
        print(f"📡 連線狀態: {resp.status_code}")
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        table = soup.find('table')
        
        if not table:
            print("❌ 錯誤：找不到任何表格 (<table>)！")
            print("   可能原因：網站改版，或是需要登入。")
            # 檢查是否有登入提示
            if "登入" in resp.text:
                print("   ⚠️  偵測到「登入」關鍵字，可能需要 Cookie。")
            return

        print("✅ 找到表格了！開始分析結構...\n")
        
        # 1. 印出標題列 (Headers)
        headers = [th.get_text().strip() for th in table.find_all('th')]
        print(f"📋 表格標題 (Headers): {headers}")
        print("-" * 30)

        # 2. 印出前 10 筆資料 (Rows)
        rows = table.find_all('tr')[1:] # 跳過標題
        if not rows:
            print("❌ 表格是空的 (沒有 tr 資料列)！")
            return

        print(f"🔍 顯示前 10 筆資料 (共 {len(rows)} 筆)：")
        for i, row in enumerate(rows[:10]):
            cols = [td.get_text().strip() for td in row.find_all('td')]
            print(f"   [{i+1}] {cols}")

    except Exception as e:
        print(f"❌ 發生錯誤: {e}")

if __name__ == "__main__":
    inspect_page()