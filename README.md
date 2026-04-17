# Invoice Generation — Setup Guide

## Project Structure
```
invoice-app/
├── client/          ← React frontend (CRA)
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── pages/
│       │   ├── InvoiceForm.jsx
│       │   ├── InvoiceForm.module.css
│       │   ├── Login.jsx
│       │   └── Login.module.css
│       ├── App.jsx
│       ├── index.css
│       └── index.jsx
└── server/          ← Express backend
    ├── index.js
    ├── package.json
    └── .env.example
```

## Setup

### 1. Server
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### 2. Client
```bash
cd client
npm install
npm start
```

The React app runs on http://localhost:3000 and proxies API calls to http://localhost:5000.

## Environment Variables (server/.env)
| Variable    | Description                        |
|-------------|------------------------------------|
| JWT_SECRET  | Secret key for JWT token signing   |
| USERNAME    | Login username                     |
| PASSWORD    | Login password                     |
| PORT        | Server port (default: 5000)        |
