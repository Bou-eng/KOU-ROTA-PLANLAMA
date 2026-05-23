<div align="center">
🚚 Kocaeli Cargo Route Optimizer
Full‑stack logistics optimization system
Kocaeli University Software Laboratory Project

https://img.shields.io/badge/Python-3.x-3776AB?style=flat&logo=python&logoColor=white
https://img.shields.io/badge/FastAPI-0.x-009688?style=flat&logo=fastapi&logoColor=white
https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=next.js&logoColor=white
https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white
https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat&logo=postgresql&logoColor=white

Optimizes cargo delivery across the 12 districts of Kocaeli – minimizing distance and cost with graph algorithms and route‑planning heuristics.

</div>
📑 Table of Contents
✨ Features

🏗️ Architecture

👥 Roles & Test Accounts

🚀 Quick Start

🧠 Planning Modes

🗄️ Database Schema

🔌 API Overview

🔐 Security & ⚡ Performance

⚙️ Environment Variables

🎓 Learning Outcomes

✨ Features
🧩 Category	Details
Cargo Requests	Users submit deliveries with destination, weight, count, and date
Smart Optimization	Two modes – unlimited vehicles (min cost) or exactly 3 vehicles (max cargo)
Graph‑Based Routing	Dijkstra shortest paths cached in DB for instant look‑ups
Interactive Maps	Leaflet + OpenStreetMap showing assigned routes and delivery order
Role‑Based Access	JWT authentication with USER and ADMIN roles
Full History	Admins can review all planning runs, costs, and cargo statistics
🏗️ Architecture







Layer	Stack
Frontend	Next.js 16 · React · TypeScript · Tailwind CSS · Leaflet · pnpm
Backend	FastAPI (port 8000) · SQLAlchemy · Pydantic · Uvicorn
Algorithms	Dijkstra · Distance Matrix · Two‑stage route optimization
Database	PostgreSQL with pre‑computed path caching
👥 Roles & Test Accounts
Role	Permissions	Test Email	Password
USER	Create requests, view own routes on map	user1@kocaeli.edu.tr	123456
ADMIN	Manage stations/roads, run optimizations, view history	admin@kocaeli.edu.tr	Admin123
🚀 Quick Start
⚠️ Prerequisites: PostgreSQL running · Python 3.x · Node.js 18+ · Windows PowerShell

<details> <summary><b>📦 Windows Setup (click to expand)</b></summary>
Allow script execution

powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
Install pnpm

powershell
npm install -g pnpm
Backend environment

powershell
cd ".\KOÜ ROTA PLANLAMA\apps\api"
.\venv\Scripts\activate
pip install -r requirements.txt
Frontend dependencies

powershell
cd ".\KOÜ ROTA PLANLAMA\apps\web"
pnpm install
</details>
🔧 Running the Application
Terminal 1 – Backend

bash
# Inside apps\api
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
Health check: http://127.0.0.1:8000/health

Terminal 2 – Frontend

bash
# Inside apps\web
pnpm dev
UI: http://localhost:3000

Note: The admin must configure stations, road edges, and the central hub before running any planning. Users see routes only after a plan is executed.

🧠 Planning Modes
Mode	Behaviour
UNLIMITED_MIN_COST	No vehicle limit · purely minimize total distance & cost
FIXED_3_MAX_CARGO	Exactly 3 vehicles · maximize amount of cargo delivered
🗄️ Database Schema
Table	Purpose
users	Authentication & role management
stations	District coordinates, active flag, centre designation
cargo_requests	User deliveries with PENDING → ASSIGNED → COMPLETED lifecycle
station_edges	Road connections and distances
station_paths_cache	Pre‑computed Dijkstra results for fast queries
plans	Record of every optimization run
🔌 API Overview
33 endpoints across the following prefixes:

Prefix	Responsibility
/auth/*	JWT login & token management
/stations	Public station data
/admin/stations	Station CRUD (admin)
/requests	User cargo requests
/admin/demands	Admin view of all requests
/graph/*	Shortest path and graph queries
/planning/*	Trigger optimizations, view results
/user/route	Retrieve assigned route for a user
/health	Backend health check
🔐 Security & ⚡ Performance
Security	Performance
JWT with role‑based access control	Shortest paths cached in DB
Password hashing (bcrypt)	Distance matrix pre‑computation
CORS whitelist	Active‑station filtering
SQL injection protection (ORM)	Indexed columns on frequent queries
Pydantic request validation	Connection pooling
⚙️ Environment Variables
env
DATABASE_URL=postgresql+psycopg2://yazlab3_app:123456@localhost:5432/yazlab3_new
JWT_SECRET=123456
CORS_ORIGINS=http://localhost:3000,http://192.168.56.1:3000
API_HOST=0.0.0.0
API_PORT=8000
🎓 Learning Outcomes
This project showcases real‑world logistics engineering through:

Full‑stack development with FastAPI and Next.js

REST API design and JWT authentication

Graph algorithms (Dijkstra) and route optimisation

Database modelling with SQLAlchemy

Interactive map visualisation (Leaflet)

Production‑like setup with caching and performance tuning



</div>
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







<div align="center">
Made with ❤️ at Kocaeli University
Feel free to ⭐ the repo if you find it useful!
