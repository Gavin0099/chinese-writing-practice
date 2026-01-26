import requests
from bs4 import BeautifulSoup
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 目標：南一版 114上 第一課 "魔法文字"
TARGET_ID = "0102011140100"
DETAIL_URL = f"https://pedia.cloud.edu.tw/Bookmark/TCollection?TextNameId={TARGET_ID}"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
}

def find_js_logic():
    print(f"🕵️ 正在尋找控制 btnExport 的 JavaScript 代碼...")
    print(f"🔗 來源頁面: {DETAIL_URL}")
    print("=" * 60)
    
    try:
        session = requests.Session()
        resp = session.get(DETAIL_URL, headers=HEADERS, verify=False, timeout=10)
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # 抓取所有 <script> 標籤
        scripts = soup.find_all('script')
        found = False
        
        print(f"🔍 掃描了 {len(scripts)} 個腳本區塊...\n")
        
        for i, script in enumerate(scripts):
            if script.string and "btnExport" in script.string:
                print(f"✅ 在第 {i+1} 個腳本中找到了關鍵字！內容如下：")
                print("-" * 40)
                
                # 只印出包含關鍵字的附近幾行，方便閱讀
                lines = script.string.split('\n')
                for line in lines:
                    if "btnExport" in line or "location.href" in line or "window.open" in line:
                        # 移除多餘空白，印出關鍵程式碼
                        print(f"👉 {line.strip()}")
                
                print("-" * 40)
                # 印出原始完整區塊 (如果上面看不懂，我們還可以看下面)
                # print(script.string) 
                found = True

        if not found:
            print("❌ 沒在頁面上找到 'btnExport' 的相關程式碼。")
            print("   可能代碼是寫在外部的 .js 檔案裡 (例如 site.js)。")

    except Exception as e:
        print(f"❌ 發生錯誤: {e}")

if __name__ == "__main__":
    find_js_logic()