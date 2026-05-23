🚚 Kocaeli Cargo Route Optimizer
Full-stack logistics optimization system — KOÜ Software Laboratory Project

https://img.shields.io/badge/Python-3.x-blue
https://img.shields.io/badge/FastAPI-0.x-009688
https://img.shields.io/badge/Next.js-16-black
https://img.shields.io/badge/TypeScript-5.x-3178C6
https://img.shields.io/badge/PostgreSQL-15-4169E1

Optimizes cargo delivery across 12 districts of Kocaeli, minimizing distance and cost using Dijkstra-based graph algorithms and route planning heuristics.

✨ Features
Feature	Description
📦 Cargo Requests	Users submit deliveries with destination, weight, count & date
🧠 Smart Optimization	Two modes — unlimited vehicles (min cost) or fixed 3 vehicles (max cargo)
🗺️ Graph Routing	Dijkstra-powered shortest paths with DB-cached results
📊 Interactive Maps	Leaflet + OpenStreetMap visualization of assigned routes
🔐 Role-Based Access	JWT auth with USER/ADMIN roles
🏗️ Tech Stack
Layer	Technology
Backend	FastAPI • PostgreSQL • SQLAlchemy • Pydantic
Frontend	Next.js 16 • React • TypeScript • Tailwind CSS • Leaflet
Algorithms	Dijkstra • Distance Matrix • Route Optimization
Package Manager	pnpm
👥 Roles
Role	Capabilities
USER	Create cargo requests • Track status • View assigned routes on map
ADMIN	Manage stations & road connections • Run optimizations • View planning history & costs
🔑 Test Accounts
Role	Email	Password
Admin	admin@kocaeli.edu.tr	Admin123
User	user1@kocaeli.edu.tr	123456
🚀 Quick Start (Windows / PowerShell)
Prerequisites
PostgreSQL running locally

Python 3.x + Node.js 18+

1. Allow Script Execution
powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
2. Install pnpm
powershell
npm install -g pnpm
3. Setup Backend
powershell
cd ".\KOÜ ROTA PLANLAMA\apps\api"
.\venv\Scripts\activate
pip install -r requirements.txt
4. Setup Frontend
powershell
cd ".\KOÜ ROTA PLANLAMA\apps\web"
pnpm install
5. Launch
Service	Command (separate terminals)	URL
Backend	uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload	http://127.0.0.1:8000/health
Frontend	pnpm dev	http://localhost:3000
⚠️ Admin must configure stations, edges & center before running planning. Users only see routes after planning executes.

🗺️ Planning Modes
Mode	Behavior
UNLIMITED_MIN_COST	Unlimited vehicles • Pure cost minimization
FIXED_3_MAX_CARGO	Exactly 3 vehicles • Maximize delivered cargo volume
📊 Database Core
Table	Purpose
users	Authentication & roles
stations	District-based delivery points (lat/lon, active, center flag)
cargo_requests	User deliveries with status tracking
station_edges	Road connections with distances
station_paths_cache	Precomputed Dijkstra shortest paths
plans	Optimization run history
🔌 API Summary
33 endpoints across:

Prefix	Purpose
/auth/*	JWT authentication
/stations	Public station data
/admin/stations	Station management
/requests	User cargo requests
/admin/demands	Admin request management
/graph/*	Graph & shortest paths
/planning/*	Optimization execution
/user/route	Assigned route visualization
/health	Health check
🔐 Security
JWT authentication with role-based access

Password hashing (bcrypt)

CORS configuration

SQL injection protection (ORM)

Pydantic input validation

⚡ Performance
DB-cached shortest paths

Distance matrix precomputation

Active station filtering

Indexed columns & connection pooling

⚙️ Environment Variables
env
DATABASE_URL=postgresql+psycopg2://yazlab3_app:123456@localhost:5432/yazlab3_new
JWT_SECRET=123456
CORS_ORIGINS=http://localhost:3000,http://192.168.56.1:3000
API_HOST=0.0.0.0
API_PORT=8000
🎓 Learning Outcomes
Full-stack development • REST API design • Graph algorithms • Route optimization • Database modeling • Auth & authorization • Map-based visualization • Real-world logistics


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

