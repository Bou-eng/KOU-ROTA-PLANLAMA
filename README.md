# 🚚 KOÜ Cargo Route Planning & Optimization

![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-Frontend-000000?style=for-the-badge&logo=nextdotjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-React-3178C6?style=for-the-badge&logo=typescript)
![Leaflet](https://img.shields.io/badge/Leaflet-Maps-199900?style=for-the-badge&logo=leaflet)

A full-stack **cargo route planning and optimization system** developed as a **Kocaeli University Software Laboratory project**.

The system optimizes cargo deliveries across the **12 districts of Kocaeli** by minimizing route distance and delivery cost using graph algorithms, shortest-path calculations, and route planning heuristics.

---

## 📌 Overview

This project helps manage and optimize cargo delivery operations by:

- Collecting cargo requests from users
- Grouping deliveries by target date
- Computing shortest paths between districts
- Assigning cargo to vehicles with capacity and cost constraints
- Visualizing optimized routes on interactive maps

It is designed as an educational but production-like logistics system.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python |
| Frontend | Next.js 16, React, TypeScript |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Styling | Tailwind CSS |
| Maps | Leaflet, OpenStreetMap |
| Package Manager | pnpm |
| Algorithms | Dijkstra, Distance Matrix, Route Optimization |

---

## 🧠 System Architecture

```mermaid
flowchart LR
    User[User / Admin] --> Web[Next.js Frontend]
    Web --> API[FastAPI Backend]
    API --> DB[(PostgreSQL)]
    API --> Algorithms[Route Optimization Engine]
    Algorithms --> Graph[Station Graph]
    Web --> Maps[Leaflet + OpenStreetMap]
```

---

## 👥 User Roles

| Role | Permissions |
|---|---|
| **USER** | Create cargo requests, view request status, view assigned routes on map |
| **ADMIN** | Manage stations, roads, cargo requests, planning runs, and optimization results |

---

## 🔑 Default Test Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@kocaeli.edu.tr` | `Admin123` |
| User | `user1@kocaeli.edu.tr` | `123456` |

---

## ✨ Core Features

### 📍 Station Management

- District-based delivery stations
- Latitude / longitude coordinates
- Active / inactive station control
- Distribution center selection

### 📦 Cargo Requests

- Destination station
- Cargo count
- Total weight in kilograms
- Target delivery date
- Status tracking: `PENDING`, `ASSIGNED`, `COMPLETED`

### 🧮 Route Optimization

| Mode | Description |
|---|---|
| `UNLIMITED_MIN_COST` | Uses unlimited vehicles and minimizes total delivery cost |
| `FIXED_3_MAX_CARGO` | Uses exactly 3 vehicles and maximizes delivered cargo |

### 🗺️ Graph-Based Routing

- Stations are represented as graph nodes
- Roads are represented as weighted edges
- Shortest paths are calculated using Dijkstra
- Frequently used paths are cached in the database

---

## 🗄️ Core Database Tables

| Table | Purpose |
|---|---|
| `users` | Stores user and admin accounts |
| `stations` | Stores district stations and coordinates |
| `cargo_requests` | Stores delivery requests |
| `station_edges` | Stores road connections and distances |
| `station_paths_cache` | Stores cached shortest paths |
| `plans` | Stores route planning results |

---

## 🔌 API Overview

The backend contains **33 REST API endpoints**.

| Group | Endpoint Prefix |
|---|---|
| Authentication | `/auth/*` |
| Stations | `/stations`, `/admin/stations` |
| Cargo Requests | `/requests`, `/admin/demands` |
| Graph Operations | `/graph/*` |
| Planning | `/planning/*` |
| User Route | `/user/route` |
| Health Check | `/health` |

---

## 🔐 Security

- JWT authentication
- Role-based access control
- Password hashing
- CORS configuration
- SQLAlchemy ORM protection
- Pydantic input validation

---

## ⚡ Performance Optimizations

- Precomputed shortest-path cache
- Distance matrix generation
- Active station filtering
- Indexed database columns
- Database connection pooling

---

## 🚀 Getting Started

> [!IMPORTANT]  
> These instructions are written for **Windows PowerShell**.  
> Backend and frontend must be run in **separate terminals**.

---

## ✅ Prerequisites

Make sure you have installed:

- Python
- Node.js
- PostgreSQL
- Git
- pnpm

Install pnpm globally if needed:

```powershell
npm install -g pnpm
```

---

## ⚙️ Environment Variables

Create a `.env` file inside the backend project and configure it like this:

```env
DATABASE_URL=postgresql+psycopg2://yazlab3_app:123456@localhost:5432/yazlab3_new
JWT_SECRET=123456
CORS_ORIGINS=http://localhost:3000,http://192.168.56.1:3000
API_HOST=0.0.0.0
API_PORT=8000
```

> [!NOTE]  
> PostgreSQL must be running before starting the backend.

---

## 🧩 Installation

### 1. Allow PowerShell Script Execution

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

### 2. Install Backend Dependencies

```powershell
cd ".\KOÜ ROTA PLANLAMA\apps\api"

.\venv\Scripts\activate

pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```powershell
cd ".\KOÜ ROTA PLANLAMA\apps\web"

pnpm install
```

---

## ▶️ Running the Project

### Terminal 1 — Start Backend

```powershell
cd ".\KOÜ ROTA PLANLAMA\apps\api"

.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend health check:

```text
http://127.0.0.1:8000/health
```

---

### Terminal 2 — Start Frontend

```powershell
cd ".\KOÜ ROTA PLANLAMA\apps\web"

pnpm dev
```

Frontend URL:

```text
http://localhost:3000
```

---

## 🧪 Quick Workflow

```mermaid
sequenceDiagram
    participant Admin
    participant User
    participant System

    Admin->>System: Create stations and road edges
    Admin->>System: Set distribution center
    User->>System: Create cargo request
    Admin->>System: Run route optimization
    System->>System: Calculate shortest paths
    System->>System: Assign cargo to vehicles
    User->>System: View assigned route on map
```

---

## 🎓 Educational Value

This project demonstrates:

- Full-stack web development
- REST API design
- Database modeling
- Authentication and authorization
- Graph algorithms
- Route optimization
- Map-based visualization
- Real-world logistics problem solving

---

## 📍 Important Notes

> [!WARNING]  
> The admin must complete the station, edge, and center setup before route planning can be executed.

> [!TIP]  
> Users can only see delivery routes after an admin runs the planning algorithm.

---

## 📄 License

This project was developed for educational purposes as part of a Kocaeli University Software Laboratory project.


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








