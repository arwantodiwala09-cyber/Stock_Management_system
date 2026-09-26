# StockSense

StockSense is a professional inventory management SaaS for organizations managing products, warehouses, locations, and stock movements.

## Architecture

* **Frontend**: React + Vite + Tailwind CSS + React Router
* **Backend**: Node.js + Express.js
* **Database / Backend Services**: Supabase PostgreSQL + Auth + Realtime + Storage
* **Validation**: Zod
* **Structure**: Modular Monolith

## Multi-Tenancy

StockSense is designed as a multi-tenant SaaS. All tenant-owned records will eventually use `organization_id` and PostgreSQL Row Level Security (RLS) to ensure data isolation. 

## Development Phases

The project is structured to be built incrementally:

* **PHASE 1**: Foundation (Initialization, Architecture, Structure)
* **PHASE 2**: Database + RLS
* **PHASE 3**: Authentication + Organizations + RBAC
* **PHASE 4**: Products + Categories + Warehouses + Locations + Stock
* **PHASE 5**: Central Inventory Engine + Stock Ledger
* **PHASE 6**: Receipts + Deliveries + Transfers + Adjustments
* **PHASE 7**: Notifications + Realtime + Activity
* **PHASE 8**: Analytics + Stock Intelligence + Smart Reorder
* **PHASE 9**: Audit + Comments + Attachments + Saved Views
* **PHASE 10**: PDF + CSV Import + Export
* **PHASE 11**: Advanced Search + Responsive UX + Dark/Light Mode + Performance
* **PHASE 12**: Testing + Security Hardening + Production Preparation

## Getting Started

### Prerequisites
- Node.js
- npm
- Supabase Project

### Installation
1. Clone the repository
2. Install frontend dependencies: `cd frontend && npm install`
3. Install backend dependencies: `cd server && npm install`
4. Create `.env` files based on `.env.example` in both `frontend` and `server` folders.

### Running the App
1. Start Backend: `cd server && npm run dev`
2. Start Frontend: `cd frontend && npm run dev`
