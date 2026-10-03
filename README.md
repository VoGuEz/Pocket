# Pocket

Pocket is a project i built for tracking personal expenses .It has FastApi integrated in it with javascipt as the front end. It helps users record daily spending, analyze trends, filter transactions, and export records as CSV while keeping all data locally in SQLite.

## Overview 

The application is designed for quick, practical personal finance tracking. Users can:

- Add new expenses with a title, amount, category, date, and optional note
- Filter expenses by category, date range, and free-text search
- Delete entries when needed
- View spending summaries and charts
- Export the current filtered view to CSV
- Switch between dark/light-themed interfaces

## Product specification

### Core features

1. Expense entry
2. Expense management
3. Filtering and search
4. Analytics
5. Reporting and export
6. Interface and UX

## Technology stack

- Backend: FastAPI
- Database: SQLite
- Frontend: HTML, CSS, JavaScript
- Charting: Chart.js
- Runtime: Python 3.11+

## Project structure

```text
Pocket/
├── backend/
│   ├── main.py
│   ├── expenses.db
│   └── requirements.txt
├── frontend/
│   ├── app.js
│   ├── index.html
│   ├── style.css
│   ├── chart.umd.js
│   └── images/
├── .gitignore
└── README.md
```

## Backend specification

The backend is implemented in `backend/main.py` and serves both the API and the static frontend assets.

### Database schema

The application uses a single SQLite table named `expenses` with the following shape:

```sql
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    note TEXT DEFAULT ''
)
```

Notes:
- The database file is stored at `backend/expenses.db`
- A date index is created for faster date-based queries
- The backend also includes migration logic to support schema normalization for legacy data

### API endpoints

#### GET `/api/categories`
Returns the list of available categories, including default categories and any custom categories already recorded.

#### GET `/api/expenses`
Returns all expenses matching optional filters.

Query parameters:
- `category` (optional)
- `start` (optional ISO date)
- `end` (optional ISO date)
- `search` (optional text search)

#### POST `/api/expenses`
Creates a new expense.

Request body:
```json
{
  "title": "Trotro to Campus",
  "amount": 14.5,
  "category": "Transport",
  "date": "2026-10-03",
  "note": "Daily commute"
}
```

#### DELETE `/api/expenses/{expense_id}`
Deletes an individual expense record.

#### GET `/api/stats`
Returns dashboard summary stats and chart-friendly aggregates.

Response includes:
- total
- count
- largest
- average
- daily_average
- by_category
- by_month
- by_day

## Default categories

The default category set is:

- Food
- Transport
- Books
- Entertainment
- Health
- Shopping
- Bills
- Other

## Frontend specification

The frontend is a single-page dashboard that loads from `frontend/index.html` and communicates with the API via `/api` endpoints.

### Dashboard modules

- KPI summary cards
- Expense form
- Spending donut chart by category
- Monthly spending bar chart
- Daily trend line chart
- Expense table with search and filters
- CSV export button
- Theme selector and toast alerts

## Local development setup

### Prerequisites

- Python 3.11+
- pip
- A modern web browser

### Windows setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Then open:

```text
http://localhost:8000
```

The app will serve the frontend and API from the same origin.

### Production-like local run

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Functional requirements summary

Pocket satisfies the following requirements:

- Personal expense tracking with local persistence
- Fast, simple UI for daily expense entry
- Multi-criteria filtering and detailed analytics
- Exportable records for spreadsheet workflows
- Theme customization and polished dashboard experience
- No external services required for core usage

## Notes and assumptions

- The application is intended for single-user local usage rather than multi-user deployment
- Data is stored locally in SQLite, so it is suitable for personal budgeting and small-scale record-keeping
- The frontend is static and served by FastAPI, which keeps deployment simple

## Future enhancements

Potential future improvements include:

- User authentication and multiple accounts
- Recurring expenses and budgets
- Editable expense entries
- Import from CSV files
- Charts with date-range presets and downloadable reports
- API authentication and remote deployment support

## License

This project is intended for local personal finance tracking and can be adapted for broader use as needed.
