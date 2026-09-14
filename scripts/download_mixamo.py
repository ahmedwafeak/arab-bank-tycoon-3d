import os
import time
import requests

# ==========================================
# ضع الـ Bearer Token الخاص بك هنا
# ==========================================
BEARER_TOKEN = "ضع_الرمز_هنا"

# الحركات المطلوبة لمشروع لعبة البنك
TARGET_ANIMATIONS = [
    {"query": "Walking", "name": "walking"},
    {"query": "Breathing Idle", "name": "idle"},
    {"query": "Sitting Idle", "name": "sitting"},
    {"query": "Typing", "name": "typing"},
]

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "animations")
os.makedirs(OUTPUT_DIR, exist_ok=True)

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN.strip()}",
    "X-Api-Key": "mixamo2",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

def search_animation(query):
    url = f"https://www.mixamo.com/api/v1/products?page=1&limit=5&order=&type=Motion&query={requests.utils.quote(query)}"
    res = requests.get(url, headers=HEADERS)
    if res.status_code == 200:
        data = res.json()
        results = data.get("results", [])
        if results:
            return results[0]
    print(f"[-] لم يتم العثور على حركة لـ: {query} (كود الحالة: {res.status_code})")
    return None

def export_and_download(product, save_name):
    product_name = product.get("name")
    character_id = product.get("character_id", "")
    print(f"[+] جاري طلب تصدير: {product_name}...")

    payload = {
        "character_id": character_id,
        "type": "Motion",
        "product_name": product_name,
        "preferences": {
            "format": "fbx7",
            "skin": "false",  # بدون مجسم لتقليل الحجم
            "fps": "30",
            "reduce_keyframes": "0"
        }
    }

    export_url = "https://www.mixamo.com/api/v1/animations/export"
    res = requests.post(export_url, json=payload, headers=HEADERS)
    if res.status_code not in (200, 202):
        print(f"[-] فشل طلب التصدير لـ {product_name}: {res.text}")
        return False

    job = res.json()
    job_uuid = job.get("uuid") or job.get("job_uuid")

    # متابعة حالة تجهيز الملف
    monitor_url = f"https://www.mixamo.com/api/v1/characters/{character_id}/monitor"
    print(f"[+] في انتظار إتمام تجهيز الملف في سيرفر أدوبي...")

    download_url = None
    for _ in range(30):
        time.sleep(2)
        mon_res = requests.get(monitor_url, headers=HEADERS)
        if mon_res.status_code == 200:
            mon_data = mon_res.json()
            if mon_data.get("status") == "completed":
                download_url = mon_data.get("job_result")
                break
            elif mon_data.get("status") == "failed":
                print(f"[-] فشل التصدير من سيرفر أدوبي.")
                return False

    if not download_url:
        print(f"[-] انتهت مهلة الانتظار لـ {product_name}.")
        return False

    # تحميل الملف النهائي
    file_path = os.path.join(OUTPUT_DIR, f"{save_name}.fbx")
    print(f"[+] جاري تنزيل الملف إلى: {file_path}")
    dl_res = requests.get(download_url, stream=True)
    with open(file_path, "wb") as f:
        for chunk in dl_res.iter_content(chunk_size=8192):
            f.write(chunk)

    print(f"[✓] تم حفظ {save_name}.fbx بنجاح!\n")
    return True

def main():
    if BEARER_TOKEN == "ضع_الرمز_هنا":
        print("[!] تنبيه: يرجى فتح الملف ووضع الـ Bearer Token الخاص بك أولاً.")
        return

    for item in TARGET_ANIMATIONS:
        prod = search_animation(item["query"])
        if prod:
            export_and_download(prod, item["name"])

if __name__ == "__main__":
    main()
