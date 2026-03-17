# Stage-FE — Corporate Stock Management App

A full-stack web application designed to help corporations efficiently manage their inventory and stock operations.

---

## 📋 Project Overview

This project is a **Stock Management System** built for corporate use. It provides a centralised platform to track products, manage warehouses, monitor stock levels, process incoming and outgoing shipments, and generate reports — all through a clean, responsive web interface.

---

## 🚀 Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | **React.js** (with React Router, Context API / Redux) |
| Backend     | **Node.js** with **Express.js**     |
| Database    | **Oracle Express Edition (XE)** or **PostgreSQL** |
| API Style   | RESTful API (JSON)                  |

---

## 🗂️ Key Features

### Inventory Management
- Add, update, and delete products (name, SKU, description, category, unit price)
- Track current stock quantities per product and per warehouse
- Set minimum stock thresholds and receive low-stock alerts

### Warehouse & Location Management
- Manage multiple warehouses or storage locations
- Assign stock to specific locations within a warehouse

### Stock Movements
- Record incoming stock (supplier deliveries / purchase orders)
- Record outgoing stock (sales orders / internal transfers)
- Full movement history with timestamps and responsible user

### Order Management
- Create and track purchase orders (inbound) and sales/dispatch orders (outbound)
- Order status workflow: *Pending → Confirmed → Shipped → Received/Delivered*

### Reporting & Dashboard
- Real-time dashboard showing total stock value, low-stock items, and recent activity
- Exportable reports (stock levels, movement history, orders)

### User Management & Authentication
- Role-based access control (Admin, Manager, Warehouse Staff)
- Secure login with JWT-based authentication

---

## 🏗️ Project Structure (planned)

```
Stage-FE/
├── client/                  # React frontend
│   ├── public/
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Page-level components (Dashboard, Products, Orders…)
│       ├── services/        # API call helpers (axios)
│       ├── store/           # State management (Context API or Redux)
│       └── App.jsx
│
├── server/                  # Node.js + Express backend
│   ├── config/              # Database connection config
│   ├── controllers/         # Route handler logic
│   ├── middleware/          # Auth, error handling
│   ├── models/              # Database models / query helpers
│   ├── routes/              # Express route definitions
│   └── index.js             # Entry point
│
└── README.md
```

---

## 🗄️ Database

The application supports two database options:

- **Oracle Express Edition (XE)** — suitable for enterprise environments already using Oracle infrastructure.
- **PostgreSQL** — a powerful, open-source relational database ideal for cloud deployments.

Both options use relational schemas with tables for Products, Categories, Warehouses, Stock, Orders, Order Lines, Users, and Audit Logs.

---

## ⚙️ Getting Started

### Prerequisites
- Node.js ≥ 18
- npm or yarn
- Oracle XE or PostgreSQL installed and running

### Installation

```bash
# Clone the repository
git clone https://github.com/aayoubchadi/Stage-FE.git
cd Stage-FE

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Configuration

Create a `.env` file inside the `server/` directory:

```env
# General
PORT=5000
JWT_SECRET=your_jwt_secret_here

# PostgreSQL example
DB_CLIENT=pg
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_management
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Oracle XE example (alternative)
# DB_CLIENT=oracledb
# DB_CONNECT_STRING=localhost/XEPDB1
# DB_USER=your_oracle_user
# DB_PASSWORD=your_oracle_password
```

### Running the App

```bash
# Start the backend (from server/)
npm run dev

# Start the frontend (from client/)
npm start
```

The React app will be available at `http://localhost:3000` and the API at `http://localhost:5000`.

---

## 🧪 Testing

```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test
```

---

## 📄 License

This project is developed as part of an internship (stage). All rights reserved.
