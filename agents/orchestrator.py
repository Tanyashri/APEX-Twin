"""The check-and-support loop:  Challenger tests -> Champion fixes -> Challenger audits -> repeat."""
from __future__ import annotations

import time

from .challenger import Challenger
from .champion import Champion
from .config import Config
from .llm import LLM, make_llm
from .store import Store


class Orchestrator:
    def __init__(self, cfg: Config | None = None, llm: LLM | None = None):
        self.cfg = cfg or Config()
        self.llm = llm or make_llm(self.cfg)
        self.store = Store(self.cfg.db_path, self.cfg.jsonl_path)
        self.challenger = Challenger(self.cfg, self.llm, self.store)
        self.champion = Champion(self.cfg, self.llm, self.store, self.challenger)

    def cycle(self) -> dict:
        report = {"test": self.challenger.run_cycle(), "fixes": {}, "reopened": []}
        for f in self.store.open_findings():
            report["fixes"][f["id"]] = self.champion.handle(f)
        report["reopened"] = self.challenger.reverify_fixes()   # Challenger watches the Champion's past work
        self.store.log("system", "cycle_done", **{k: v for k, v in report.items() if k != "test"})
        return report

    def loop(self) -> None:
        while True:
            try:
                print(self.cycle())
            except KeyboardInterrupt:
                raise
            except Exception as e:  # the supervisor itself must never die
                self.store.log("system", "cycle_crashed", error=repr(e))
            time.sleep(self.cfg.interval_s)
