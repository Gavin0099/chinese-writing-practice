"""Build a local curriculum candidate from the Sinica workbook."""

import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import unicodedata

from openpyxl import load_workbook


SOURCE_PAGE = "https://ball.ling.sinica.edu.tw/brain/edu/radical.html"
PUBLISHERS = ("南一", "康軒", "翰林")
COLUMNS = ("冊", "年度", "年級", "學期", "課次", "類型", "生字")
KINDS = {"習寫字": "writing", "認讀字": "recognition"}
LOCAL_OUTPUT = Path(__file__).resolve().parents[1] / "artifacts/runtime/curriculum-115"


def load_editions(workbook_path, year, semester):
    workbook = load_workbook(workbook_path, read_only=True, data_only=True)
    grouped = defaultdict(lambda: defaultdict(list))
    seen = set()
    try:
        for publisher in PUBLISHERS:
            sheet = workbook[publisher]
            rows = sheet.iter_rows(max_col=len(COLUMNS), values_only=True)
            if next(rows, None) != COLUMNS:
                raise ValueError(f"Unexpected workbook header in {publisher}")
            for row_number, row in enumerate(rows, start=2):
                book, row_year, grade, row_semester, lesson, kind, character = row
                if row_year != year or row_semester != semester:
                    continue
                location = f"{publisher}!A{row_number}:G{row_number}"
                if not isinstance(book, str) or not book.startswith(str(year)):
                    raise ValueError(f"Invalid book at {location}")
                if type(grade) is not int or not 1 <= grade <= 6:
                    raise ValueError(f"Invalid grade at {location}")
                if lesson is not None and (type(lesson) is not int or lesson < 1):
                    raise ValueError(f"Invalid lesson at {location}")
                if kind not in KINDS or not isinstance(character, str) or len(character) != 1:
                    raise ValueError(f"Invalid character or category at {location}")
                if not unicodedata.name(character, "").startswith(("CJK UNIFIED", "CJK COMPATIBILITY")):
                    raise ValueError(f"Expected a Han character at {location}")
                key = (publisher, grade, lesson, kind, character)
                if key in seen:
                    raise ValueError(f"Duplicate character row at {location}")
                seen.add(key)
                grouped[publisher, grade][lesson].append({"kind": KINDS[kind], "character": character, "workbook_row": row_number})
    finally:
        workbook.close()
    expected = {(publisher, grade) for publisher in PUBLISHERS for grade in range(1, 7)}
    if grouped.keys() != expected:
        raise ValueError(f"Missing publisher/grade for {year}/{semester}: {sorted(expected - grouped.keys())}")
    return [
        {"academic_year": year, "publisher": publisher, "grade": grade, "semester": semester,
         "workbook_sheet": publisher,
         "lessons": [{"number": number, "characters": lessons[number]}
                     for number in sorted(lessons, key=lambda n: n or 0)]}
        for (publisher, grade), lessons in grouped.items()
    ]


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--year", type=int, default=115)
    parser.add_argument("--semester", type=int, choices=(1, 2), default=1)
    parser.add_argument("--output-dir", type=Path, default=LOCAL_OUTPUT)
    parser.add_argument("--check-pedia", action="store_true", help="Compare public catalogs and lesson pages. Reuse local HTML snapshots when present.")
    args = parser.parse_args()
    editions = load_editions(args.workbook, args.year, args.semester)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    source = {"publisher": "中央研究院大腦與語言實驗室", "url": SOURCE_PAGE,
              "file": args.workbook.name, "sha256": hashlib.sha256(args.workbook.read_bytes()).hexdigest()}
    lessons = [lesson for edition in editions for lesson in edition["lessons"]]
    summary = {"editions": len(editions), "numbered_lessons": sum(lesson["number"] is not None for lesson in lessons),
               "unnumbered_groups": sum(lesson["number"] is None for lesson in lessons),
               "character_rows": sum(len(lesson["characters"]) for lesson in lessons)}
    prefix = f"{args.year}-{args.semester}"
    comparison_has_differences = False
    if args.check_pedia:
        from curriculum_pedia import compare_catalogs

        results = compare_catalogs(editions, args.output_dir / "pedia")
        statuses = Counter(result["status"] for result in results)
        summary["pedia_comparison"] = dict(statuses)
        comparison_has_differences = statuses["match"] != len(results)
        write_json(args.output_dir / f"comparison-{prefix}.json", {"workbook": source, "summary": summary, "results": results})
    write_json(args.output_dir / f"candidate-{prefix}.json", {
        "schema_version": 1, "status": "candidate", "source": source, "editions": editions,
    })
    print(json.dumps(summary, ensure_ascii=False))
    return int(comparison_has_differences)


if __name__ == "__main__":
    raise SystemExit(main())
