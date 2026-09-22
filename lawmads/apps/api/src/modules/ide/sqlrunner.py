# Executes a SQL script against an in-memory SQLite database and prints result rows
# in sqlite3 CLI "list" mode (pipe-separated, no header) — the Judge0 SQL contract.
import sqlite3, sys
src = open(sys.argv[1], encoding="utf-8").read()
con = sqlite3.connect(":memory:")
buf = ""
for line in src.splitlines(keepends=True):
    buf += line
    if sqlite3.complete_statement(buf):
        stmt = buf.strip()
        buf = ""
        if not stmt:
            continue
        cur = con.execute(stmt)
        if cur.description:
            for row in cur.fetchall():
                print("|".join("" if v is None else str(v) for v in row))
if buf.strip():
    cur = con.execute(buf.strip())
    if cur.description:
        for row in cur.fetchall():
            print("|".join("" if v is None else str(v) for v in row))
