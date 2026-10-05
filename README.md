# Pocket

Pocket is a project i built for tracking personal expenses .It has FastApi integrated in it with javascipt as the front end. It helps users record daily spending, analyze trends, filter transactions, and export records as CSV while keeping all data locally in SQLite which has been integrated into the system.

## Overview 

The application is designed for quick, practical personal finance tracking. Users can:

- Add new expenses with a title, amount, category, date, and optional note
- Delete custom categories while keeping their expenses under the built-in Other category
- Filter expenses by category, date range, and free-text search
- Delete entries when needed
- View spending summaries and charts
- Export the current filtered view to CSV
- Switch between dark/light-themed interfaces

### Core features

1. Ability to add expenses 
2. Able to list expenses
3. Delete the expense 
4. Calculate total expenses you have 
5. Filter expenses by category 

## Technology stack

- Backend: FastAPI
- Database: SQLite
- Frontend: HTML, CSS, JavaScript
- Charting: Chart.js
- Runtime: Python 3.11+

## Project structure

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

## Notes

- The application is intended for single-user local usage rather than multi-user deployment
- Data is stored locally in SQLite, so it is suitable for personal budgeting and small-scale record-keeping
- The frontend is static and served by FastAPI, which keeps deployment simple

## License

This project is intended for local personal use it can be adapted for broader use as needed.
