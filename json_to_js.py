import json
import os

# 設定路徑
# 直接使用當前目錄, 因為腳本會放在專案根目錄
JSON_PATH = "char_core_4808.json"
JS_OUTPUT_PATH = "db_core.js" 

print(f"🚀 正在將 JSON 轉換為 Web 可用的 JS 檔案...")

try:
    # 1. 讀取 JSON
    if not os.path.exists(JSON_PATH):
        raise FileNotFoundError(f"找不到檔案: {JSON_PATH}")
        
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 2. 包裝成全域變數 (Global Variable)
    # 這樣在瀏覽器中，只要載入這個檔，window.MOE_DATA 就會有資料
    js_content = f"window.MOE_DATA = {json.dumps(data, ensure_ascii=False)};"
    
    # 3. 寫入 JS
    with open(JS_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print(f"✅ 轉換完成！已產生: {JS_OUTPUT_PATH}")
    
except Exception as e:
    print(f"❌ 錯誤: {e}")
