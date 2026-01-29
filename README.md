📦 KOÜ Cargo Route Planning & Optimization System

A full-stack cargo route planning and optimization system developed as a Kocaeli University (KOÜ) Software Laboratory project.
The system optimizes cargo delivery routes across the 12 districts of Kocaeli, minimizing distance and cost using graph algorithms and route planning heuristics.

🎯 Project Purpose

This system helps manage and optimize cargo delivery by:

Collecting cargo requests from users

Aggregating and optimizing deliveries by date

Computing shortest paths between districts

Assigning cargo to vehicles under capacity and cost constraints

Visualizing routes on interactive maps

It is designed as an educational but production-like system demonstrating real-world logistics optimization.

🏗️ System Architecture
Backend

Framework: FastAPI (Python)

Port: 8000

Database: PostgreSQL

ORM: SQLAlchemy

Algorithms: Dijkstra, distance matrix, route optimization

Maps/Data: Graph-based routing

Frontend

Framework: Next.js 16 + React (TypeScript)

Port: 3000

Styling: Tailwind CSS

Maps: Leaflet + OpenStreetMap

Package Manager: pnpm

👥 User Roles
1️⃣ Regular Users (USER)

Users can:

Create cargo requests (destination, weight, count, date)

View request statuses

View assigned delivery routes on an interactive map

See delivery order and distances

2️⃣ Admin Users (ADMIN)

Admins can:

Manage stations (districts)

Define road connections and distances

Set a center (distribution hub)

View and manage all cargo requests

Run route optimization algorithms

Analyze planning results and costs

View historical planning runs

🔑 Default Test Accounts
Role	Email	Password
Admin	admin@kocaeli.edu.tr	Admin123
User	user1@kocaeli.edu.tr	123456
🚀 How to Run the Project (Most Important Section)

⚠️ Important:
These steps are written for Windows (PowerShell) and must be executed in order.

🧩 Step 1 — Allow Script Execution (PowerShell)

Open PowerShell as User and run:

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

🧩 Step 2 — Install pnpm (Frontend Package Manager)
cd ".\KOÜ ROTA PLANLAMA\apps\web"
npm install -g pnpm

🧩 Step 3 — Activate Backend Virtual Environment & Install Dependencies
cd ".\KOÜ ROTA PLANLAMA\apps\api"
.\venv\Scripts\activate
pip install -r requirements.txt

🧩 Step 4 — Install Frontend Dependencies
cd "c:\Users\Ebu-l Emin\Desktop\KOÜ ROTA PLANLAMA\apps\web"
pnpm install

🧩 Step 5 — Ensure Backend Dependencies Are Installed
cd ".\KOÜ ROTA PLANLAMA\apps\api"
& ".\venv\Scripts\python.exe" -m pip install -r requirements.txt

▶️ Running the Application
▶️ Run Backend Server (Terminal 1)
Set-Location ".\KOÜ ROTA PLANLAMA\apps\api"
& "./KOÜ ROTA PLANLAMA/apps/api/venv/Scripts/python.exe" `
-m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload


Backend health check:

http://127.0.0.1:8000/health

▶️ Run Frontend Server (Terminal 2)
cd apps/web
pnpm.cmd dev


Frontend will be available at:

http://localhost:3000

🗺️ Core Features Overview
📍 Station Management

District-based delivery stations

Coordinates (lat/lon)

Active/inactive control

Center station designation

📦 Cargo Request System

Destination station

Cargo count

Total weight (kg)

Target delivery date

Status tracking (PENDING / ASSIGNED / COMPLETED)

🧠 Route Planning & Optimization

Two planning modes:

UNLIMITED_MIN_COST

Unlimited vehicles

Cost minimization

FIXED_3_MAX_CARGO

Exactly 3 vehicles

Maximize delivered cargo

🗺️ Graph-Based Routing

Nodes: Stations

Edges: Roads with distances

Algorithm: Dijkstra

Cached shortest paths for performance

🗄️ Database Schema (Core Tables)

users

stations

cargo_requests

station_edges

station_paths_cache

plans

🔌 API Overview

Total: 33 endpoints

Includes:

Authentication (/auth/*)

Station management (/stations, /admin/stations)

Cargo requests (/requests, /admin/demands)

Graph operations (/graph/*)

Planning (/planning/*)

User routes (/user/route)

Health check (/health)

🔐 Security Features

JWT authentication

Role-based access control (USER / ADMIN)

Password hashing

CORS configuration

SQL injection protection (ORM)

Input validation (Pydantic)

⚡ Performance Optimizations

Precomputed shortest paths (DB caching)

Distance matrix generation

Active station filtering

Indexed database columns

Connection pooling

🎓 Educational Value

This project demonstrates:

Full-stack development

REST API design

Graph algorithms

Route optimization

Database modeling

Authentication & authorization

Map-based visualization

Real-world logistics problem solving

🧪 Environment Variables Example
DATABASE_URL=postgresql+psycopg2://yazlab3_app:123456@localhost:5432/yazlab3_new
JWT_SECRET=123456
CORS_ORIGINS=http://localhost:3000,http://192.168.56.1:3000
API_HOST=0.0.0.0
API_PORT=8000

✅ Final Notes

Backend and frontend must be run in separate terminals

PostgreSQL must be running

Admin must complete setup (stations, edges, center) before planning

Users only see routes after planning is executed

Here are some Screenshots from the website:
<img width="1920" height="1024" alt="Screenshot (99)" src="https://github.com/user-attachments/assets/3ca60ffc-3d62-438c-b87f-58beb330fca1" />
<img width="1920" height="1022" alt="Screenshot (98)" src="https://github.com/user-attachments/assets/a85c7110-14a9-4f53-bebe-4287d1b11fb4" />
<img width="1920" height="1014" alt="Screenshot (97)" src="https://github.com/user-attachments/assets/c18e383d-0970-4a0f-86f9-96b969039bcb" />
<img width="1920" height="1021" alt="Screenshot (96)" src="https://github.com/user-attachments/assets/7ce8dfc2-0c4e-4e3e-a560-f0cbcd57454c" />
<img width="1920" height="1012" alt="Screenshot (95)" src="https://github.com/user-attachments/assets/acd45347-cfc3-4141-9df8-c9f9022ec557" />
<img width="1920" height="1020" alt="Screenshot (91)" src="https://github.com/user-attachments/assets/2685cfe4-375a-432a-851a-fabd8619f417" />
<img width="1920" height="1016" alt="Screenshot (108)" src="https://github.com/user-attachments/assets/3270f985-0c88-4a97-b7c8-671fd7ce9532" />
<img width="1920" height="1012" alt="Screenshot (107)" src="https://github.com/user-attachments/assets/ba1d1280-41f9-4387-9568-7e2a46d74e31" />
<img width="1920" height="1015" alt="Screenshot (106)" src="https://github.com/user-attachments/assets/d9a0bcbc-f962-4353-87ce-bdf4b4853889" />
<img width="1920" height="1020" alt="Screenshot (105)" src="https://github.com/user-attachments/assets/ad742e8a-0993-4404-a35d-e27de591a385" />
<img width="1920" height="1018" alt="Screenshot (104)" src="https://github.com/user-attachments/assets/6edc3b5f-49db-4b26-91a8-9a803c1f4039" />
<img width="1920" height="1013" alt="Screenshot (103)" src="https://github.com/user-attachments/assets/b722a26b-7447-4385-a054-284685faf861" />
<img width="1920" height="1014" alt="Screenshot (102)" src="https://github.com/user-attachments/assets/3f3aad73-6188-479c-aafb-43f81d21afba" />
<img width="1920" height="1013" alt="Screenshot (101)" src="https://github.com/user-attachments/assets/eb2d6f42-ddde-46ea-af88-9f61caf39df3" />
<img width="1920" height="1007" alt="Screenshot (100)" src="https://github.com/user-attachments/assets/f672303d-bdc6-4380-afdd-b364b23c93cb" />

