"""Run the pinned framework's adoption checks for this repository."""

from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys


def main() -> int:
    repo = Path(__file__).resolve().parents[1]
    framework = repo / "ai-governance-framework"
    if not (framework / "governance_tools").is_dir():
        print("Run git submodule update --init --recursive first.", file=sys.stderr)
        return 1

    lock = json.loads((repo / "governance/framework.lock.json").read_text(encoding="utf-8"))
    checkout = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=framework, text=True).strip()
    if lock.get("adopted_commit") != checkout:
        print(f"Framework lock and checkout disagree (checkout {checkout}).", file=sys.stderr)
        return 1

    env = {**os.environ, "PYTHONPATH": str(framework), "PYTHONUTF8": "1",
           "AI_GOVERNANCE_NO_LEDGER_WRITE": "1"}
    framework_args = ["--repo", ".", "--framework-root", framework.name]
    checks = [
        ("governance_tools.domain_contract_loader", ["--contract", "contract.yaml"]),
        ("governance_tools.governance_drift_checker", framework_args),
        ("governance_tools.hook_install_validator", framework_args),
        ("governance_tools.external_repo_readiness", framework_args),
        ("governance_tools.memory_workflow", ["--check", "--repo", ".", "--run-guard", "--fail-on-blocker"]),
    ]
    for event in ("session_start", "pre_task", "post_task"):
        checks.append(("runtime_hooks.smoke_test", [
            "--harness", "codex", "--event-type", event,
            "--project-root", ".", "--plan-path", "PLAN.md", "--contract", "contract.yaml",
        ]))

    failed = False
    for module, arguments in checks:
        print(f"\n{module} {' '.join(arguments)}", flush=True)
        result = subprocess.run([sys.executable, "-m", module, *arguments], cwd=repo, env=env, check=False)
        failed |= result.returncode != 0
    return int(failed)


if __name__ == "__main__":
    raise SystemExit(main())
