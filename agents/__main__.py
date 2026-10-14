"""CLI:
  python -m agents once      one test->fix->audit cycle
  python -m agents loop      run forever (AGENT_INTERVAL_S between cycles)
  python -m agents report    show recent runs, findings, fixes
  python -m agents tail      follow the activity log
"""
import json
import sys
import time

from .config import Config
from .orchestrator import Orchestrator
from .store import Store


def report(cfg: Config) -> None:
    s = Store(cfg.db_path, cfg.jsonl_path)
    print("== last runs ==")
    for r in s.db.execute("SELECT * FROM runs ORDER BY id DESC LIMIT 5"):
        print(f"#{r['id']} {r['kind']:<11} {r['status']:<8} {r['summary']}")
    print("\n== findings ==")
    for f in s.db.execute("SELECT * FROM findings ORDER BY id DESC LIMIT 20"):
        print(f"#{f['id']} [{f['status']:<19}] {f['severity']:<8} {f['title']}  (attempts={f['attempts']})")
    print("\n== fixes ==")
    for x in s.db.execute("SELECT * FROM fixes ORDER BY id DESC LIMIT 10"):
        print(f"fix#{x['id']} finding#{x['finding_id']} try{x['attempt']} {x['method']} {x['status']} {x['branch']} :: {(x['verdict'] or '')[:100]}")


def tail(cfg: Config) -> None:
    pos = 0
    while True:
        if cfg.jsonl_path.exists():
            with open(cfg.jsonl_path) as f:
                f.seek(pos)
                for line in f:
                    e = json.loads(line)
                    print(f"{time.strftime('%H:%M:%S', time.localtime(e.pop('ts')))} {e.pop('actor'):<10} {e.pop('event'):<28} {e}")
                pos = f.tell()
        time.sleep(1)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "once"
    cfg = Config()
    if cmd == "report":
        report(cfg)
    elif cmd == "tail":
        tail(cfg)
    elif cmd == "loop":
        Orchestrator(cfg).loop()
    else:
        print(json.dumps(Orchestrator(cfg).cycle(), indent=2, default=str))
