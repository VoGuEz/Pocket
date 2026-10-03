"""Expense Tracker API - FastAPI + SQLite."""
import sqlite3
from contextlib import contextmanager
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "expenses.db"
FRONTEND_DIR = BASE_DIR.parent / "frontend"

CATEGORIES = ["Food", "Transport", "Books", "Entertainment", "Health", "Shopping", "Bills", "Other"]

app = FastAPI(title="Pocket", version="1.0.0")


@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with db() as conn:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                amount REAL NOT NULL CHECK (amount > 0),
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                note TEXT DEFAULT ''
            )"""
        )
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(expenses)")}
        if "title" not in columns and "description" in columns:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute(
                """CREATE TABLE expenses_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    amount REAL NOT NULL CHECK (amount > 0),
                    category TEXT NOT NULL,
                    date TEXT NOT NULL,
                    note TEXT DEFAULT ''
                )"""
            )
            conn.execute(
                """INSERT INTO expenses_new (id, title, amount, category, date, note)
                   SELECT id, description, amount, category, date, '' FROM expenses"""
            )
            conn.execute("DROP TABLE expenses")
            conn.execute("ALTER TABLE expenses_new RENAME TO expenses")
        elif "title" not in columns:
            raise RuntimeError("Unsupported expenses database schema")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)")


init_db()


class ExpenseIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0, lt=1_000_000_000)
    category: str = Field(..., min_length=1, max_length=50)
    date: date
    note: Optional[str] = Field("", max_length=300)


class ExpenseOut(ExpenseIn):
    id: int


def _filters(category, start, end, search):
    where, params = [], []
    if category and category != "All":
        where.append("category = ?")
        params.append(category)
    if start:
        where.append("date >= ?")
        params.append(start.isoformat())
    if end:
        where.append("date <= ?")
        params.append(end.isoformat())
    if search:
        where.append("(title LIKE ? OR note LIKE ?)")
        params += [f"%{search}%", f"%{search}%"]
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    return clause, params


@app.get("/api/categories")
def categories():
    with db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT category FROM expenses ORDER BY category COLLATE NOCASE"
        ).fetchall()
    saved = [row["category"] for row in rows if row["category"] not in CATEGORIES]
    return [*CATEGORIES, *saved]


@app.get("/api/expenses", response_model=list[ExpenseOut])
def list_expenses(
    category: Optional[str] = None,
    start: Optional[date] = None,
    end: Optional[date] = None,
    search: Optional[str] = Query(None, max_length=100),
):
    clause, params = _filters(category, start, end, search)
    with db() as conn:
        rows = conn.execute(
            f"SELECT * FROM expenses {clause} ORDER BY date DESC, id DESC", params
        ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/expenses", response_model=ExpenseOut, status_code=201)
def add_expense(exp: ExpenseIn):
    category = exp.category.strip()
    if not category:
        raise HTTPException(422, "Category cannot be empty")
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO expenses (title, amount, category, date, note) VALUES (?,?,?,?,?)",
            (exp.title.strip(), round(exp.amount, 2), category, exp.date.isoformat(), exp.note or ""),
        )
        new_id = cur.lastrowid
    return {**exp.model_dump(), "id": new_id, "title": exp.title.strip(), "amount": round(exp.amount, 2), "category": category}


@app.delete("/api/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: int):
    with db() as conn:
        cur = conn.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
        if cur.rowcount == 0:
            raise HTTPException(404, "Expense not found")


@app.get("/api/stats")
def stats(
    category: Optional[str] = None,
    start: Optional[date] = None,
    end: Optional[date] = None,
    search: Optional[str] = Query(None, max_length=100),
):
    """Totals plus chart data for the (optionally filtered) expense set."""
    clause, params = _filters(category, start, end, search)
    with db() as conn:
        total = conn.execute(
            f"SELECT COALESCE(SUM(amount),0) t, COUNT(*) c, COALESCE(MAX(amount),0) m FROM expenses {clause}",
            params,
        ).fetchone()
        by_cat = conn.execute(
            f"SELECT category, SUM(amount) total, COUNT(*) count FROM expenses {clause} "
            "GROUP BY category ORDER BY total DESC",
            params,
        ).fetchall()
        by_month = conn.execute(
            f"SELECT substr(date,1,7) month, SUM(amount) total FROM expenses {clause} "
            "GROUP BY month ORDER BY month",
            params,
        ).fetchall()
        by_day = conn.execute(
            f"SELECT date, SUM(amount) total FROM expenses {clause} GROUP BY date ORDER BY date",
            params,
        ).fetchall()
    days = len(by_day)
    return {
        "total": round(total["t"], 2),
        "count": total["c"],
        "largest": round(total["m"], 2),
        "average": round(total["t"] / total["c"], 2) if total["c"] else 0,
        "daily_average": round(total["t"] / days, 2) if days else 0,
        "by_category": [dict(r) for r in by_cat],
        "by_month": [dict(r) for r in by_month],
        "by_day": [dict(r) for r in by_day],
    }


@app.get("/")
def index():
    return FileResponse(FRONTEND_DIR / "index.html")


app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
