"""Assemble the pinned browser OCR assets from locally downloaded dependencies."""
import argparse
from hashlib import sha256
import json
from pathlib import Path
from shutil import copyfile

import onnxruntime

MODEL_HASH = "5825fc7ebf84ae7a412be049820b4d86d77620f204a041697b0494669b1742c5"
RUNTIME_FILES = ("ort.wasm.min.mjs", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm")


def prepare(model, runtime, target):
    if sha256(model.read_bytes()).hexdigest() != MODEL_HASH:
        raise ValueError("The model does not match the validated PP-OCRv5 mobile model.")
    package = json.loads((runtime / "package.json").read_text(encoding="utf-8"))
    if package.get("name") != "onnxruntime-web" or package.get("version") != "1.22.0":
        raise ValueError("Use onnxruntime-web 1.22.0.")
    options = onnxruntime.SessionOptions()
    options.intra_op_num_threads = 1
    session = onnxruntime.InferenceSession(str(model), sess_options=options, providers=["CPUExecutionProvider"])
    alphabet = session.get_modelmeta().custom_metadata_map["character"].splitlines()
    if len(alphabet) != 18383:
        raise ValueError("Unexpected number of characters in the OCR model.")
    target.mkdir(parents=True, exist_ok=True)
    for file in RUNTIME_FILES:
        copyfile(runtime / "dist" / file, target / file)
    copyfile(model, target / "ppocr-v5-rec-mobile.onnx")
    (target / "ppocr-v5-characters.json").write_text(json.dumps(alphabet, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", type=Path)
    parser.add_argument("runtime", type=Path, help="Installed onnxruntime-web package directory")
    parser.add_argument("target", type=Path, help="Destination photo-ocr-assets directory")
    args = parser.parse_args()
    prepare(args.model, args.runtime, args.target)
