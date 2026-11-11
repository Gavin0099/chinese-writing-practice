"""Compare lesson membership with the public Education Encyclopedia catalogs."""

import re
import time
from collections import Counter
from urllib.parse import urlencode

from bs4 import BeautifulSoup
import requests


BASE_URL = "https://pedia.cloud.edu.tw/Bookmark"
CHARACTER_TYPES = {"生字": "writing", "習寫字": "writing", "認讀字": "recognition"}
NUMERALS = "一 二 三 四 五 六 七 八 九 十 十一 十二 十三 十四 十五 十六 十七 十八 十九 二十".split()


def read_page(session, cache, name, url):
    path = cache / f"{name}.html"
    if not path.exists():
        time.sleep(0.25)
        response = session.get(url, timeout=15)
        response.raise_for_status()
        path.write_text(response.content.decode("utf-8-sig"), encoding="utf-8")
    return BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")


def read_catalog(session, cache, year, publisher, grade, semester):
    fields = {
        "category": "國語",
        "year": f"{year}_{semester}",
        "degree": str(grade),
        "press": publisher + "版",
    }
    url = f"{BASE_URL}/Textword?{urlencode(fields)}"
    page = read_page(session, cache, f"catalog-{year}-{semester}-{publisher}-{grade}", url)
    for key, element_id in zip(fields, ("categoryValue", "semesterValue", "degreeValue", "pressValue")):
        if not page.find("input", id=element_id, value=fields[key]):
            raise ValueError(f"Catalog filter mismatch: {key}")
    entries = {}
    for cell in page.select("td.textname[id]"):
        title = cell.select_one("strong")
        if not title or not re.fullmatch(r"[0-9]+", cell["id"]):
            raise ValueError("Missing catalog title or lesson identifier")
        title = title.get_text(strip=True)
        number = re.match(r"^第\s*([一二三四五六七八九十0-9]+)\s*課", title)
        if number:
            number = number[1]
            number = int(number) if number.isdecimal() else NUMERALS.index(number) + 1
        else:
            number = None
        if number in entries:
            raise ValueError(f"Duplicate or ambiguous catalog lesson: {title}")
        entries[number] = {"title": title, "id": cell["id"]}
    if not entries or page.select_one('.pagination a[href]:not([href="#"])'):
        raise ValueError("Catalog is empty or paginated")
    return entries, url


def read_lesson(session, cache, entry):
    url = f"{BASE_URL}/TCollection?{urlencode({'TextNameId': entry['id']})}"
    page = read_page(session, cache, f"lesson-{entry['id']}", url)
    if not page.find("input", attrs={"name": "textNameId", "value": entry["id"]}):
        raise ValueError("Lesson identifier missing from detail page")
    if not page.find("input", attrs={"name": "strName", "value": entry["title"]}):
        raise ValueError("Detail title differs from catalog")
    total = page.select_one(".wording")
    count = re.search(r"共\s*(\d+)\s*筆", total.get_text()) if total else None
    rows = page.select("tbody tr:has(td.word_class)")
    if not count or int(count[1]) != len(rows):
        raise ValueError("Detail row count differs from the site's entry count")
    words = Counter()
    for row in rows:
        category_cell = row.select_one("td.type")
        if category_cell is None:
            raise ValueError("Detail entry lacks a category")
        category = category_cell.get_text(strip=True)
        if category not in CHARACTER_TYPES:
            continue
        character = row.select_one("td.word_class").get_text(strip=True)
        if len(character) != 1:
            raise ValueError("Character category contains a multi-character entry")
        words[CHARACTER_TYPES[category], character] += 1
    if not words:
        raise ValueError("Detail contains no character entries")
    return words, url


def summarize_rows(rows):
    return [{"kind": kind, "character": char, "count": count} for (kind, char), count in sorted(rows.items())]


def compare_catalogs(editions, cache):
    cache.mkdir(parents=True, exist_ok=True)
    results = []
    with requests.Session() as session:
        session.headers["User-Agent"] = "ChineseWritingPractice-CurriculumCheck/1.0"
        for edition in editions:
            key = {name: edition[name] for name in ("academic_year", "publisher", "grade", "semester")}
            year, publisher, grade, semester = key.values()
            print(f"Checking {year}/{semester} {publisher} grade {grade}", flush=True)
            try:
                catalog, catalog_url = read_catalog(session, cache, year, publisher, grade, semester)
            except (requests.RequestException, ValueError) as error:
                results.append({**key, "status": "catalog_unavailable", "error": str(error)})
                continue
            lessons = {lesson["number"]: lesson for lesson in edition["lessons"]}
            for number in sorted(lessons.keys() | catalog.keys(), key=lambda n: n or 0):
                record = {**key, "lesson": number, "catalog_url": catalog_url}
                if number not in catalog:
                    results.append({**record, "status": "missing_from_pedia"})
                    continue
                entry = catalog[number]
                record.update(title=entry["title"], pedia_id=entry["id"])
                if number not in lessons:
                    results.append({**record, "status": "missing_from_workbook"})
                    continue
                try:
                    pedia, detail_url = read_lesson(session, cache, entry)
                except (requests.RequestException, ValueError) as error:
                    results.append({**record, "status": "detail_unavailable", "error": str(error)})
                    continue
                lesson = lessons[number]
                workbook = Counter((row["kind"], row["character"]) for row in lesson["characters"])
                duplicate_pedia_rows = Counter({item: count - 1 for item, count in pedia.items() if count > 1})
                pedia_unique = Counter({item: 1 for item in pedia})
                workbook_only = workbook - pedia_unique
                pedia_only = pedia_unique - workbook
                status = "different" if workbook_only or pedia_only or duplicate_pedia_rows else "match"
                lesson["pedia"] = {"title": entry["title"], "url": detail_url, "status": status}
                results.append({**record, "detail_url": detail_url, "status": status,
                                "workbook_only": summarize_rows(workbook_only), "pedia_only": summarize_rows(pedia_only),
                                "duplicate_pedia_rows": summarize_rows(duplicate_pedia_rows)})
    return results
