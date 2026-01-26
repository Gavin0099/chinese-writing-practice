import requests
from bs4 import BeautifulSoup
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 目標：一年級 下學期
URL = "https://pedia.cloud.edu.tw/Bookmark/Textword?year=113_2&degree=1&category=%E5%9C%8B%E8%AA%9E"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Referer": "https://pedia.cloud.edu.tw/Bookmark/Textword"
}

def xray_scan():
    print(f"🩻 正在對網頁進行 X 光掃描: {URL}")
    print("=" * 60)
    
    try:
        resp = requests.get(URL, headers=HEADERS, verify=False, timeout=10)
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        table = soup.find('table')
        if not table:
            print("❌ 找不到表格")
            return

        rows = table.find_all('tr')[1:] # 跳過標題
        
        # 我們只看第一筆南一版的資料就好，不用全部看
        target_row = None
        for row in rows:
            if "南一" in row.get_text():
                target_row = row
                break
        
        if not target_row:
            print("❌ 沒找到南一版的資料列")
            return

        print("✅ 鎖定第一筆「南一版」資料列，開始掃描...")
        cols = target_row.find_all('td')
        
        # 掃描所有欄位，因為按鈕可能在第2欄，也可能在第3欄
        for col_idx, col in enumerate(cols):
            links = col.find_all('a')
            if not links: continue
            
            print(f"\n🔍 在第 {col_idx+1} 欄找到了 {len(links)} 個連結:")
            
            for i, link in enumerate(links):
                print(f"   --- 🔗 Link {i+1} ---")
                print(f"   [顯示文字]: {link.get_text().strip()}")
                print(f"   [所有屬性]: {link.attrs}")
                
                # 幫您重點檢查 onclick
                if 'onclick' in link.attrs:
                    print(f"   👉 發現 onclick: {link.attrs['onclick']}")
                
                # 幫您重點檢查 href
                if 'href' in link.attrs:
                    print(f"   👉 發現 href: {link.attrs['href']}")

    except Exception as e:
        print(f"❌ 發生錯誤: {e}")

if __name__ == "__main__":
    xray_scan()