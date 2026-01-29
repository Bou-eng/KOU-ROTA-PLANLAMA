from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text, func
import os
import logging
from typing import Optional, List, Dict, Tuple
from pydantic import BaseModel
from dotenv import load_dotenv
from datetime import date as dt_date, datetime, timedelta
import json

# CRITICAL: Load environment variables BEFORE importing any modules that use them
load_dotenv()

from app.db import get_db, engine, SessionLocal
from app.models import User, UserRole, Station, CargoRequest, StationEdge, StationPathCache, Plan
from app.schemas import (
    RegisterRequest,
    LoginRequest,
    UserOut,
    LoginResponse,
    StationCreate,
    StationOut,
    StationUpdate,
    StationActiveUpdate,
    CargoRequestCreate,
    CargoRequestOut,
    DemandSummaryItem,
    DemandDetailItem,
    DemandsResponse,
    StationEdgeCreate,
    StationEdgeOut,
    ShortestPathResponse,
    ExpandRouteRequest,
    ExpandRouteResponse,
    BuildMatrixResponse,
    PlanningRunRequest,
    PlanningResponse,
    PlanningVehicle,
    PlanningStationStop,
    PlanningRunSummary,
    UserRouteResponse,
)
from app.security import hash_password, verify_password, create_access_token, decode_access_token, get_jwt_secret, get_jwt_algorithm
from app.graph import build_adjacency, dijkstra, dijkstra_single_source
from jose import JWTError

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://yazlab3_app:123456@localhost:5432/yazlab3_new")
CORS_ORIGINS_STR = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://192.168.56.1:3000")
CORS_ORIGINS = [o.strip() for o in CORS_ORIGINS_STR.split(",")]

# Get JWT config dynamically
JWT_SECRET = get_jwt_secret()
JWT_ALGORITHM = get_jwt_algorithm()

# Startup logs
logger.info("=" * 60)
logger.info("KOÜ Kargo API Starting")
logger.info(f"API running on http://localhost:8000")
logger.info(f"CORS Origins: {CORS_ORIGINS}")
logger.info(f"JWT_ALGORITHM: {JWT_ALGORITHM}")
logger.info(f"JWT_SECRET: {JWT_SECRET[:20]}..." if JWT_SECRET else "JWT_SECRET: NOT SET")

# Test DB connection on startup
try:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("DB connection test: OK")
except Exception as e:
    logger.error(f"DB connection test: FAILED - {str(e)}")

logger.info("=" * 60)

app = FastAPI(title="KOÜ Kargo API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer(auto_error=False)

# ===== Settings Endpoints (center station stored in stations table) =====

class CenterStationResponse(BaseModel):
    center_station_id: Optional[int] = None
    center_station_name: Optional[str] = None


class CenterStationRequest(BaseModel):
    center_station_id: int


@app.get("/settings/center-station", response_model=CenterStationResponse)
def get_center_station(db: Session = Depends(get_db)):
    """Get current center station (NO AUTH)."""
    center = db.query(Station).filter(Station.is_center == True, Station.is_active == True).first()
    if center:
        return CenterStationResponse(center_station_id=center.id, center_station_name=center.name)
    return CenterStationResponse(center_station_id=None, center_station_name=None)


@app.post("/settings/center-station", response_model=CenterStationResponse)
def set_center_station(req: CenterStationRequest, db: Session = Depends(get_db)):
    """Set center station (NO AUTH). Exactly one station can be center."""
    # Validate: station must exist and be active
    station = db.query(Station).filter(Station.id == req.center_station_id).first()
    if not station:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="İstasyon bulunamadı.")
    if not station.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="İstasyon pasif. Merkez istasyon olamaz.")

    try:
        # Clear previous center flags
        db.query(Station).filter(Station.is_center == True).update({Station.is_center: False})
        # Set selected station as center
        db.query(Station).filter(Station.id == req.center_station_id).update({Station.is_center: True})
        db.commit()
        return CenterStationResponse(center_station_id=station.id, center_station_name=station.name)
    except Exception:
        db.rollback()
        logger.error("set_center_station failed", exc_info=True)
        raise HTTPException(status_code=500, detail="Merkez istasyon ayarlanırken bir hata oluştu.")


# ===== Auth Endpoints =====


def _validate_password_length(password: str, max_bytes: int = 72) -> str:
    pwd = password.strip()
    if not pwd:
        raise HTTPException(status_code=400, detail="Şifre boş olamaz.")
    if len(pwd.encode("utf-8")) > max_bytes:
        raise HTTPException(status_code=422, detail="Şifre en fazla 72 byte olabilir.")
    return pwd


@app.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    password = _validate_password_length(req.password)

    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bu e-posta zaten kayıtlı.")

    role_value = (req.role or "USER").upper()
    if role_value not in [r.value for r in UserRole]:
        raise HTTPException(status_code=400, detail="Geçersiz rol.")

    try:
        user = User(
            email=email,
            password_hash=hash_password(password),
            role=UserRole(role_value),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        logger.error(f"Register error: {e}")
        raise HTTPException(status_code=500, detail="Kayıt sırasında bir hata oluştu.")


@app.post("/auth/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    password = _validate_password_length(req.password)

    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")

    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role.value,
    })

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut(id=user.id, email=user.email, role=user.role.value)
    )


def _get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), db: Session = Depends(get_db)) -> User:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Kimlik doğrulama başarısız.")
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz token.")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Geçersiz token.")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı.")
    return user


@app.get("/auth/me", response_model=UserOut)
def auth_me(current_user: User = Depends(_get_current_user)):
    return UserOut(id=current_user.id, email=current_user.email, role=current_user.role.value)


@app.get("/admin/stations", response_model=list[StationOut])
def get_all_stations(db: Session = Depends(get_db)):
    """Get ALL stations including passive ones (admin endpoint, NO AUTH)."""
    stations = db.query(Station).order_by(Station.name).all()
    return stations


@app.get("/stations", response_model=list[StationOut])
def get_active_stations(db: Session = Depends(get_db)):
    """Get all active stations (public endpoint, NO AUTH)."""
    stations = db.query(Station).filter(Station.is_active == True).order_by(Station.name).all()
    return stations


@app.post("/admin/stations", response_model=StationOut, status_code=status.HTTP_201_CREATED)
def create_station(req: StationCreate, db: Session = Depends(get_db)):
    """Create a new station (NO AUTH - open for testing)."""
    # Check if station name already exists (case-insensitive)
    existing = db.query(Station).filter(func.lower(Station.name) == func.lower(req.name.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu istasyon adı zaten kullanımda."
        )
    
    try:
        new_station = Station(
            name=req.name.strip(),
            lat=req.lat,
            lon=req.lon,
            is_active=True
        )
        db.add(new_station)
        db.commit()
        db.refresh(new_station)
        logger.info(f"Station created: {new_station.name} (id={new_station.id})")
        return new_station
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating station: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="İstasyon oluşturulurken bir hata oluştu."
        )


@app.patch("/admin/stations/{station_id}", response_model=StationOut)
def update_station(station_id: int, req: StationUpdate, db: Session = Depends(get_db)):
    """Update station name, lat, lon (NO AUTH)."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="İstasyon bulunamadı."
        )
    
    # Check if new name conflicts with another station (case-insensitive, excluding current)
    existing = db.query(Station).filter(
        func.lower(Station.name) == func.lower(req.name.strip()),
        Station.id != station_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu istasyon adı zaten kullanımda."
        )
    
    try:
        station.name = req.name.strip()
        station.lat = req.lat
        station.lon = req.lon
        db.commit()
        db.refresh(station)
        logger.info(f"Station updated: {station.name} (id={station.id})")
        return station
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating station: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="İstasyon güncellenirken bir hata oluştu."
        )


@app.patch("/admin/stations/{station_id}/active", response_model=StationOut)
def toggle_station_active(station_id: int, req: StationActiveUpdate, db: Session = Depends(get_db)):
    """Toggle station active status (NO AUTH)."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="İstasyon bulunamadı."
        )
    
    try:
        station.is_active = req.is_active
        db.commit()
        db.refresh(station)
        status_text = "aktif" if req.is_active else "pasif"
        logger.info(f"Station {status_text}: {station.name} (id={station.id})")
        return station
    except Exception as e:
        db.rollback()
        logger.error(f"Error toggling station active: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="İstasyon durumu değiştirilirken bir hata oluştu."
        )


@app.delete("/admin/stations/{station_id}")
def delete_station(station_id: int, db: Session = Depends(get_db)):
    """Delete a station and ALL related data (cascade: cargo_requests, edges, cache)."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="İstasyon bulunamadı."
        )
    
    try:
        # Start transaction: delete in dependency order
        # 1. Delete cargo requests referencing this station
        db.execute(text("""
            DELETE FROM app.cargo_requests 
            WHERE station_id = :station_id
        """), {"station_id": station_id})
        
        # 2. Delete path cache entries
        db.execute(text("""
            DELETE FROM app.station_paths_cache
            WHERE from_station_id = :station_id OR to_station_id = :station_id
        """), {"station_id": station_id})
        
        # 3. Delete edges (both directions)
        db.execute(text("""
            DELETE FROM app.station_edges 
            WHERE from_station_id = :station_id OR to_station_id = :station_id
        """), {"station_id": station_id})
        
        # 4. Delete the station itself
        db.delete(station)
        db.commit()
        
        logger.info(f"Station deleted: {station.name} (id={station_id}) with all dependencies")
        return {"ok": True}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting station {station_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="İstasyon silinemedi. Bu istasyonu kullanan kayıtlar temizlenemedi."
        )


@app.post("/admin/stations/reset-all")
def reset_all_stations(db: Session = Depends(get_db)):
    """[DEV ONLY] Delete all stations and related data. NO AUTH."""
    try:
        # Delete in dependency order
        cache_count = db.execute(text("DELETE FROM app.station_paths_cache")).rowcount
        edges_count = db.execute(text("DELETE FROM app.station_edges")).rowcount
        requests_count = db.execute(text("DELETE FROM app.cargo_requests")).rowcount
        stations_count = db.execute(text("DELETE FROM app.stations")).rowcount
        
        db.commit()
        
        logger.info(f"Reset all: deleted {stations_count} stations, {requests_count} requests, {edges_count} edges, {cache_count} cache entries")
        return {
            "ok": True,
            "deleted": {
                "stations": stations_count,
                "cargo_requests": requests_count,
                "station_edges": edges_count,
                "station_paths_cache": cache_count
            }
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error resetting stations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Sıfırlama başarısız oldu."
        )


def get_user_by_header(request: Request, db: Session) -> User:
    email = request.headers.get("X-User-Email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın."
        )
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kullanıcı bulunamadı. Lütfen tekrar giriş yapın."
        )
    return user


@app.post("/requests", response_model=CargoRequestOut, status_code=status.HTTP_201_CREATED)
def create_cargo_request(
    req: CargoRequestCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    user = get_user_by_header(request, db)

    station = (
        db.query(Station)
        .filter(Station.id == req.station_id, Station.is_active == True)
        .first()
    )
    if not station:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="İstasyon bulunamadı veya pasif."
        )

    try:
        new_request = CargoRequest(
            user_id=user.id,
            station_id=req.station_id,
            cargo_count=req.cargo_count,
            total_weight_kg=req.total_weight_kg,
            target_date=req.target_date,
            status="PENDING",
        )
        db.add(new_request)
        db.commit()
        db.refresh(new_request)
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating cargo request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Talep oluşturulurken bir hata oluştu."
        )

    return CargoRequestOut(
        id=new_request.id,
        station_id=new_request.station_id,
        station_name=station.name,
        cargo_count=new_request.cargo_count,
        total_weight_kg=new_request.total_weight_kg,
        target_date=new_request.target_date,
        status=new_request.status,
        created_at=new_request.created_at,
        user_email=user.email,
    )


@app.get("/requests/me", response_model=list[CargoRequestOut])
def get_my_requests(request: Request, db: Session = Depends(get_db)):
    user = get_user_by_header(request, db)

    rows = (
        db.query(
            CargoRequest,
            Station.name.label("station_name"),
        )
        .join(Station, Station.id == CargoRequest.station_id)
        .filter(CargoRequest.user_id == user.id)
        .order_by(CargoRequest.created_at.desc())
        .all()
    )

    results: list[CargoRequestOut] = []
    for cargo_req, station_name in rows:
        results.append(
            CargoRequestOut(
                id=cargo_req.id,
                station_id=cargo_req.station_id,
                station_name=station_name,
                cargo_count=cargo_req.cargo_count,
                total_weight_kg=cargo_req.total_weight_kg,
                target_date=cargo_req.target_date,
                status=cargo_req.status,
                created_at=cargo_req.created_at,
                user_email=user.email,
            )
        )
    return results


@app.get("/admin/demands", response_model=DemandsResponse)
def get_admin_demands(date: str, db: Session = Depends(get_db)):
    if not date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tarih bilgisi zorunludur."
        )
    try:
        parsed_date = dt_date.fromisoformat(date)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Geçersiz tarih formatı. YYYY-MM-DD olmalıdır."
        )

    summary_rows = (
        db.query(
            CargoRequest.station_id.label("station_id"),
            Station.name.label("station_name"),
            func.sum(CargoRequest.cargo_count).label("total_count"),
            func.sum(CargoRequest.total_weight_kg).label("total_weight_kg"),
        )
        .join(Station, Station.id == CargoRequest.station_id)
        .filter(CargoRequest.target_date == parsed_date)
        .group_by(CargoRequest.station_id, Station.name)
        .all()
    )

    detail_rows = (
        db.query(
            CargoRequest,
            User.email.label("user_email"),
            Station.name.label("station_name"),
        )
        .join(User, User.id == CargoRequest.user_id)
        .join(Station, Station.id == CargoRequest.station_id)
        .filter(CargoRequest.target_date == parsed_date)
        .order_by(CargoRequest.created_at.desc())
        .all()
    )

    summary = [
        DemandSummaryItem(
            station_id=row.station_id,
            station_name=row.station_name,
            total_count=int(row.total_count or 0),
            total_weight_kg=float(row.total_weight_kg or 0),
        )
        for row in summary_rows
    ]

    details = [
        DemandDetailItem(
            id=req.id,
            user_email=user_email,
            station_name=station_name,
            cargo_count=req.cargo_count,
            total_weight_kg=req.total_weight_kg,
            status=req.status,
            created_at=req.created_at,
            target_date=req.target_date,
        )
        for req, user_email, station_name in detail_rows
    ]

    return DemandsResponse(summary=summary, details=details)


@app.delete("/admin/demands/{request_id}")
def delete_demand(request_id: int, db: Session = Depends(get_db)):
    """Hard delete a cargo request from DB.

    Returns 200 with {ok: true} on success.
    - 404 if not found.
    - 500 if delete fails due to constraints; ensures rollback.
    """
    demand = db.query(CargoRequest).filter(CargoRequest.id == request_id).first()
    if not demand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talep bulunamadı.")

    try:
        db.delete(demand)
        db.commit()
        return {"ok": True}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting demand {request_id}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Talep silinemedi. (Bağlı kayıtlar olabilir)")


@app.delete("/admin/demands")
def delete_all_demands(date: Optional[str] = None, db: Session = Depends(get_db)):
    """Delete all cargo requests, optionally filtered by target date.
    
    Query parameters:
    - date: Optional YYYY-MM-DD string to filter by target_date
    
    Returns: {"deleted": <count>}
    
    On error, rolls back and returns 500.
    """
    try:
        query = db.query(CargoRequest)
        if date:
            query = query.filter(CargoRequest.target_date == date)
        
        count = query.count()
        if count == 0:
            return {"deleted": 0}
        
        query.delete(synchronize_session=False)
        db.commit()
        return {"deleted": count}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting all demands: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Toplu silme işlemi başarısız.")


# ===== Graph / Shortest Path Endpoints =====

@app.get("/graph/edges", response_model=list[StationEdgeOut])
def get_edges(db: Session = Depends(get_db)):
    """Get all station edges (NO AUTH - open for development)."""
    edges = db.query(StationEdge).order_by(StationEdge.id).all()
    return edges


@app.post("/graph/edges", response_model=StationEdgeOut, status_code=status.HTTP_201_CREATED)
def create_edge(req: StationEdgeCreate, response: Response, db: Session = Depends(get_db)):
    """
    Create or update a road connection between two stations (NO AUTH).

    Validations:
    - Both stations must exist and be active
    - from_station_id != to_station_id
    - distance_km > 0
    - One edge per station pair (undirected)
    """
    # Validate: from != to
    if req.from_station_id == req.to_station_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bir istasyon kendisiyle bağlanamaz."
        )
    
    # Validate: both stations exist and are active
    from_station = db.query(Station).filter(
        Station.id == req.from_station_id,
        Station.is_active == True
    ).first()
    if not from_station:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Başlangıç istasyonu (ID: {req.from_station_id}) bulunamadı veya aktif değil."
        )
    
    to_station = db.query(Station).filter(
        Station.id == req.to_station_id,
        Station.is_active == True
    ).first()
    if not to_station:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Hedef istasyon (ID: {req.to_station_id}) bulunamadı veya aktif değil."
        )
    
    # Normalize pair to ensure a single undirected edge per station pair
    pair_a = min(req.from_station_id, req.to_station_id)
    pair_b = max(req.from_station_id, req.to_station_id)

    try:
        # Upsert: find existing edge regardless of direction
        existing = db.query(StationEdge).filter(
            ((StationEdge.from_station_id == pair_a) & (StationEdge.to_station_id == pair_b)) |
            ((StationEdge.from_station_id == pair_b) & (StationEdge.to_station_id == pair_a))
        ).first()

        if existing:
            existing.from_station_id = pair_a
            existing.to_station_id = pair_b
            existing.distance_km = req.distance_km
            existing.is_bidirectional = req.is_bidirectional
            db.commit()
            db.refresh(existing)
            response.status_code = status.HTTP_200_OK
            logger.info(f"Edge updated: {pair_a} <-> {pair_b} ({req.distance_km} km)")
            return existing

        # Create new edge
        new_edge = StationEdge(
            from_station_id=pair_a,
            to_station_id=pair_b,
            distance_km=req.distance_km,
            is_bidirectional=req.is_bidirectional
        )
        db.add(new_edge)
        db.commit()
        db.refresh(new_edge)
        logger.info(f"Edge created: {pair_a} <-> {pair_b} ({req.distance_km} km)")
        return new_edge
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating edge: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bağlantı oluşturulurken bir hata oluştu."
        )


@app.delete("/graph/edges/{edge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_edge(edge_id: int, db: Session = Depends(get_db)):
    """Delete a station edge by ID (NO AUTH)."""
    edge = db.query(StationEdge).filter(StationEdge.id == edge_id).first()
    if not edge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bağlantı bulunamadı."
        )
    
    try:
        db.delete(edge)
        db.commit()
        logger.info(f"Edge deleted: ID {edge_id}")
        return None
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting edge: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bağlantı silinirken bir hata oluştu."
        )


@app.get("/graph/shortest-path", response_model=ShortestPathResponse)
def get_shortest_path(
    from_id: int,
    to_id: int,
    use_cache: bool = True,
    db: Session = Depends(get_db)
):
    """
    Compute shortest path between two stations (NO AUTH).
    
    Query params:
    - from_id: starting station ID
    - to_id: destination station ID
    - use_cache: if True, return cached result if available (default: True)
    
    Returns shortest path with total distance and ordered station IDs.
    Caches result in database for future queries.
    """
    # Validate: both stations exist
    from_station = db.query(Station).filter(Station.id == from_id).first()
    if not from_station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Başlangıç istasyonu (ID: {from_id}) bulunamadı."
        )
    
    to_station = db.query(Station).filter(Station.id == to_id).first()
    if not to_station:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hedef istasyon (ID: {to_id}) bulunamadı."
        )
    
    # Check cache if requested
    if use_cache:
        cached = db.query(StationPathCache).filter(
            StationPathCache.from_station_id == from_id,
            StationPathCache.to_station_id == to_id
        ).first()
        if cached:
            logger.info(f"Shortest path from cache: {from_id} -> {to_id}")
            return ShortestPathResponse(
                from_station_id=from_id,
                to_station_id=to_id,
                total_distance_km=cached.total_distance_km,
                path_station_ids=cached.path_station_ids_json
            )
    
    # Compute shortest path
    adjacency = build_adjacency(db)
    total_distance, path_ids = dijkstra(adjacency, from_id, to_id)
    
    if total_distance is None or path_ids is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="İki istasyon arasında yol bulunamadı."
        )
    
    # Cache the result (upsert for both directions)
    try:
        # Cache (from, to)
        cache_entry = db.query(StationPathCache).filter(
            StationPathCache.from_station_id == from_id,
            StationPathCache.to_station_id == to_id
        ).first()
        
        if cache_entry:
            cache_entry.total_distance_km = total_distance
            cache_entry.path_station_ids_json = path_ids
            cache_entry.updated_at = datetime.utcnow()
        else:
            cache_entry = StationPathCache(
                from_station_id=from_id,
                to_station_id=to_id,
                total_distance_km=total_distance,
                path_station_ids_json=path_ids
            )
            db.add(cache_entry)
        
        # Cache reverse path (to, from) - reverse the path array
        reverse_path = list(reversed(path_ids))
        cache_entry_reverse = db.query(StationPathCache).filter(
            StationPathCache.from_station_id == to_id,
            StationPathCache.to_station_id == from_id
        ).first()
        
        if cache_entry_reverse:
            cache_entry_reverse.total_distance_km = total_distance
            cache_entry_reverse.path_station_ids_json = reverse_path
            cache_entry_reverse.updated_at = datetime.utcnow()
        else:
            cache_entry_reverse = StationPathCache(
                from_station_id=to_id,
                to_station_id=from_id,
                total_distance_km=total_distance,
                path_station_ids_json=reverse_path
            )
            db.add(cache_entry_reverse)
        
        db.commit()
        logger.info(f"Shortest path computed and cached: {from_id} -> {to_id} = {total_distance} km")
    except Exception as e:
        db.rollback()
        logger.warning(f"Failed to cache shortest path: {str(e)}")
        # Don't fail the request if caching fails
    
    return ShortestPathResponse(
        from_station_id=from_id,
        to_station_id=to_id,
        total_distance_km=total_distance,
        path_station_ids=path_ids
    )


@app.post("/graph/expand-route", response_model=ExpandRouteResponse)
def expand_route(req: ExpandRouteRequest, db: Session = Depends(get_db)):
    """
    Expand a route by computing shortest paths between consecutive stations (NO AUTH).
    
    Given a sequence of station IDs [s1, s2, ..., sn], compute the shortest path
    between each consecutive pair and return the fully expanded list of all
    intermediate stations.
    
    Request body:
    - station_ids: list of station IDs in order (e.g., [center, a, b, center])
    
    Returns:
    - expanded_station_ids: full path including all intermediate stations
    
    Errors:
    - 400/404 if any consecutive pair has no valid path
    """
    station_ids = req.station_ids
    
    if not station_ids or len(station_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rota en az 2 istasyon içermelidir."
        )
    
    expanded = []
    
    for i in range(len(station_ids) - 1):
        from_id = station_ids[i]
        to_id = station_ids[i + 1]
        
        if from_id == to_id:
            # Same station, just add it once
            if not expanded or expanded[-1] != from_id:
                expanded.append(from_id)
            continue
        
        # Get shortest path from from_id to to_id
        try:
            adjacency = build_adjacency(db)
            total_distance, path_ids = dijkstra(adjacency, from_id, to_id)
            
            if total_distance is None or path_ids is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"İstasyon {from_id} ile {to_id} arasında yol bulunamadı."
                )
            
            # Add all stations in the path, avoiding duplicate endpoints
            for sid in path_ids:
                if not expanded or expanded[-1] != sid:
                    expanded.append(sid)
        
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error expanding route segment {from_id}->{to_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Rota genişletilirken bir hata oluştu."
            )
    
    return ExpandRouteResponse(expanded_station_ids=expanded)


@app.post("/graph/build-matrix", response_model=BuildMatrixResponse)
def build_distance_matrix(db: Session = Depends(get_db)):
    """
    Build complete distance matrix for all active stations (NO AUTH).
    
    Computes shortest paths between all pairs of active stations
    and stores results in cache table.
    
    Warning: For N stations, this runs Dijkstra N times.
    Performance is acceptable for small N (district count).
    """
    # Get all active stations
    active_stations = db.query(Station).filter(Station.is_active == True).all()
    station_ids = [s.id for s in active_stations]
    
    if len(station_ids) == 0:
        return BuildMatrixResponse(pair_count=0, updated_count=0)
    
    logger.info(f"Building distance matrix for {len(station_ids)} active stations")
    
    # Build adjacency once
    adjacency = build_adjacency(db)
    
    updated_count = 0
    
    # For each station, compute shortest paths to all others
    for start_id in station_ids:
        logger.info(f"Computing paths from station {start_id}...")
        
        # Run single-source Dijkstra
        results = dijkstra_single_source(adjacency, start_id)
        
        # Store all results in cache
        for dest_id, (total_distance, path_ids) in results.items():
            if start_id == dest_id:
                continue  # Skip self-loops
            
            try:
                # Upsert cache entry
                cache_entry = db.query(StationPathCache).filter(
                    StationPathCache.from_station_id == start_id,
                    StationPathCache.to_station_id == dest_id
                ).first()
                
                if cache_entry:
                    cache_entry.total_distance_km = total_distance
                    cache_entry.path_station_ids_json = path_ids
                    cache_entry.updated_at = datetime.utcnow()
                else:
                    cache_entry = StationPathCache(
                        from_station_id=start_id,
                        to_station_id=dest_id,
                        total_distance_km=total_distance,
                        path_station_ids_json=path_ids
                    )
                    db.add(cache_entry)
                
                updated_count += 1
            except Exception as e:
                logger.error(f"Error caching path {start_id} -> {dest_id}: {str(e)}")
                # Continue with other paths
        
        # Commit after each source station
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Error committing paths from station {start_id}: {str(e)}")
    
    total_pairs = len(station_ids) * (len(station_ids) - 1)
    logger.info(f"Distance matrix built: {updated_count} paths cached out of {total_pairs} possible pairs")
    
    return BuildMatrixResponse(
        pair_count=total_pairs,
        updated_count=updated_count
    )


# ===== Planning Engine =====

def get_distance(from_id: int, to_id: int, db: Session) -> float:
    """Get distance between two stations, using cache or computing shortest path."""
    if from_id == to_id:
        return 0.0
    
    # Check cache first
    cache = db.query(StationPathCache).filter(
        StationPathCache.from_station_id == from_id,
        StationPathCache.to_station_id == to_id
    ).first()

    if cache:
        return cache.total_distance_km

    # Compute via dijkstra using adjacency built from active stations/edges
    try:
        adjacency = build_adjacency(db)
        if not adjacency or from_id not in adjacency or to_id not in adjacency:
            raise ValueError("graph_missing")

        total_distance, path_ids = dijkstra(adjacency, from_id, to_id)
        if total_distance is None or path_ids is None:
            raise ValueError("path_missing")

        # Cache forward path
        cache_entry = db.query(StationPathCache).filter(
            StationPathCache.from_station_id == from_id,
            StationPathCache.to_station_id == to_id
        ).first()

        if cache_entry:
            cache_entry.total_distance_km = total_distance
            cache_entry.path_station_ids_json = path_ids
            cache_entry.updated_at = datetime.utcnow()
        else:
            cache_entry = StationPathCache(
                from_station_id=from_id,
                to_station_id=to_id,
                total_distance_km=total_distance,
                path_station_ids_json=path_ids
            )
            db.add(cache_entry)

        # Cache reverse path for quicker subsequent lookups
        reverse_entry = db.query(StationPathCache).filter(
            StationPathCache.from_station_id == to_id,
            StationPathCache.to_station_id == from_id
        ).first()

        reverse_path = list(reversed(path_ids))
        if reverse_entry:
            reverse_entry.total_distance_km = total_distance
            reverse_entry.path_station_ids_json = reverse_path
            reverse_entry.updated_at = datetime.utcnow()
        else:
            reverse_entry = StationPathCache(
                from_station_id=to_id,
                to_station_id=from_id,
                total_distance_km=total_distance,
                path_station_ids_json=reverse_path
            )
            db.add(reverse_entry)

        db.commit()
        return total_distance
    except Exception as e:
        db.rollback()
        logger.error("Distance calculation failed", exc_info=True)
        raise


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/planning/run", response_model=PlanningResponse)
def run_planning(req: PlanningRunRequest):
    """
    Run planning with an isolated DB session so failures cannot poison other requests.
    """
    db: Session = SessionLocal()
    logger.info("[planning] started")
    try:
        # Determine plan date
        plan_date = req.date
        if not plan_date:
            plan_date_obj = datetime.utcnow().date() + timedelta(days=1)
        else:
            try:
                plan_date_obj = dt_date.fromisoformat(plan_date)
            except Exception:
                raise HTTPException(status_code=400, detail="Geçersiz tarih formatı. YYYY-MM-DD kullanın.")

        # Load demands
        logger.info(f"[planning] load demands for {plan_date_obj}")
        demands = db.query(CargoRequest).filter(
            CargoRequest.target_date == plan_date_obj,
            CargoRequest.status == "PENDING"
        ).all()
        logger.info(f"[planning] demands count: {len(demands)}")

        if not demands:
            raise HTTPException(status_code=400, detail="Seçilen tarih için talep bulunamadı.")

        # Track demand IDs for status update
        demand_ids_by_station = {}
        for req_cargo in demands:
            if req_cargo.station_id not in demand_ids_by_station:
                demand_ids_by_station[req_cargo.station_id] = []
            demand_ids_by_station[req_cargo.station_id].append(req_cargo.id)

        active_stations = db.query(Station).filter(Station.is_active == True).all()
        if not active_stations:
            raise HTTPException(status_code=400, detail="Aktif istasyon bulunamadı.")

        # Group by active stations
        station_demands: Dict[int, Dict] = {}
        for req_cargo in demands:
            station = db.query(Station).filter(Station.id == req_cargo.station_id).first()
            if not station or not station.is_active:
                continue

            if req_cargo.station_id not in station_demands:
                station_demands[req_cargo.station_id] = {
                    "station": station,
                    "total_weight_kg": 0.0,
                    "cargo_count": 0
                }
            station_demands[req_cargo.station_id]["total_weight_kg"] += req_cargo.total_weight_kg
            station_demands[req_cargo.station_id]["cargo_count"] += req_cargo.cargo_count

        if not station_demands:
            raise HTTPException(status_code=400, detail="Aktif istasyon bulunamadı.")

        # Determine center station: read from stations table (is_center)
        center = db.query(Station).filter(Station.is_center == True, Station.is_active == True).first()
        if not center:
            raise HTTPException(
                status_code=400,
                detail="Merkez istasyon seçilmemiş. Lütfen istasyonlar sayfasından merkez istasyon seçin."
            )
        
        logger.info(f"[planning] center found: {center.id} {center.name}")

        # Use parameters from request
        base_vehicles = req.vehicle_capacities
        km_unit_cost = req.km_unit_cost
        rental_vehicle_capacity = req.rental_capacity
        rental_fixed_cost = req.rental_fixed_cost
        mode = req.mode

        # Best-fit vehicle assignment
        stations_list = [
            (sid, info["total_weight_kg"], info["cargo_count"], info["station"])
            for sid, info in station_demands.items()
        ]
        stations_list.sort(key=lambda x: x[1], reverse=True)
        logger.info(f"[planning] station buckets: {len(stations_list)}")

        vehicles: List[Dict] = []
        assigned_stations: Dict[int, Tuple[int, float, int]] = {}

        # Create base vehicles
        for idx, capacity in enumerate(base_vehicles):
            vehicles.append({
                "id": f"V{idx + 1}",
                "capacity_kg": capacity,
                "is_rental": False,
                "load_kg": 0.0,
                "stations": []
            })

        # Assign stations based on mode
        for station_id, weight, cargo_count, station_obj in stations_list:
            best_vehicle_idx = None
            best_waste = float('inf')

            for vidx, veh in enumerate(vehicles):
                if not veh["is_rental"] or mode == "UNLIMITED_MIN_COST":
                    if veh["load_kg"] + weight <= veh["capacity_kg"]:
                        waste = veh["capacity_kg"] - (veh["load_kg"] + weight)
                        if waste < best_waste:
                            best_waste = waste
                            best_vehicle_idx = vidx

            if best_vehicle_idx is None:
                if mode == "UNLIMITED_MIN_COST":
                    new_veh = {
                        "id": f"V{len(vehicles) + 1}",
                        "capacity_kg": rental_vehicle_capacity,
                        "is_rental": True,
                        "load_kg": 0.0,
                        "stations": []
                    }
                    vehicles.append(new_veh)
                    best_vehicle_idx = len(vehicles) - 1
                else:
                    assigned_stations[station_id] = (-1, weight, cargo_count)
                    continue

            vehicles[best_vehicle_idx]["load_kg"] += weight
            vehicles[best_vehicle_idx]["stations"].append(station_id)
            assigned_stations[station_id] = (best_vehicle_idx, weight, cargo_count)

        logger.info("[planning] compute routes (uses distance cache)")

        # Nearest-neighbor routing for each vehicle
        vehicle_routes: List[PlanningVehicle] = []
        total_cost = 0.0
        total_km = 0.0
        total_load = 0.0
        unserved = []

        for veh in vehicles:
            route = [center.id]
            remaining = set(veh["stations"])
            current = center.id
            total_veh_km = 0.0
            veh_load = 0.0

            while remaining:
                nearest = None
                min_dist = float('inf')

                for candidate in remaining:
                    dist = get_distance(current, candidate, db)
                    if dist < min_dist:
                        min_dist = dist
                        nearest = candidate

                if nearest is None:
                    for station_id in remaining:
                        if station_id in assigned_stations:
                            weight, cargo_count = assigned_stations[station_id][1], assigned_stations[station_id][2]
                            station_obj = db.query(Station).filter(Station.id == station_id).first()
                            unserved.append({
                                "station_id": station_id,
                                "station_name": station_obj.name if station_obj else f"Station {station_id}",
                                "demand_kg": weight
                            })
                    break

                route.append(nearest)
                total_veh_km += get_distance(current, nearest, db)
                current = nearest
                remaining.remove(nearest)

                if nearest in assigned_stations:
                    veh_load += assigned_stations[nearest][1]

            if len(route) > 1:
                total_veh_km += get_distance(current, center.id, db)
            route.append(center.id)

            stops = []
            for station_id in route:
                station_obj = db.query(Station).filter(Station.id == station_id).first()
                demand_kg = 0.0
                cargo_count = 0

                if station_id in assigned_stations:
                    demand_kg = assigned_stations[station_id][1]
                    cargo_count = assigned_stations[station_id][2]

                stops.append(PlanningStationStop(
                    station_id=station_id,
                    station_name=station_obj.name if station_obj else f"Station {station_id}",
                    demand_kg=demand_kg,
                    cargo_count=cargo_count
                ))

            veh_cost = total_veh_km * km_unit_cost + (rental_fixed_cost if veh["is_rental"] else 0)
            vehicle_routes.append(PlanningVehicle(
                vehicle_id=veh["id"],
                capacity_kg=veh["capacity_kg"],
                is_rental=veh["is_rental"],
                load_kg=veh_load,
                stops=stops,
                total_km=total_veh_km,
                total_cost=veh_cost
            ))

            total_km += total_veh_km
            total_cost += veh_cost
            total_load += veh_load

        for station_id, info in assigned_stations.items():
            if info[0] == -1:
                station_obj = db.query(Station).filter(Station.id == station_id).first()
                unserved.append({
                    "station_id": station_id,
                    "station_name": station_obj.name if station_obj else f"Station {station_id}",
                    "demand_kg": info[1]
                })

        result = PlanningResponse(
            date=plan_date_obj,
            center_station={"id": center.id, "name": center.name},
            km_unit_cost=km_unit_cost,
            rental_fixed_cost=rental_fixed_cost,
            vehicles=vehicle_routes,
            total_cost=total_cost,
            total_km=total_km,
            total_load_kg=total_load,
            unserved_stations=unserved
        )

        logger.info("[planning] write results")
        saved_plan_id = None
        try:
            plan_record = Plan(
                plan_date=plan_date_obj,
                payload_json=json.loads(result.model_dump_json())
            )
            db.add(plan_record)
            db.commit()
            db.refresh(plan_record)
            saved_plan_id = plan_record.id
            logger.info(f"[planning] result saved to DB with id={saved_plan_id}")
            
            # Update status of demands that were used in this planning run
            logger.info("[planning] update demand statuses")
            used_demand_ids = []
            
            # Collect all demands that were assigned to a vehicle (served)
            for veh in result.vehicles:
                for stop in veh.stops:
                    if stop.station_id in demand_ids_by_station and stop.demand_kg > 0:
                        # All demands for this station are considered used
                        used_demand_ids.extend(demand_ids_by_station[stop.station_id])
            
            # Update their status to "PLANNED"
            if used_demand_ids:
                db.query(CargoRequest).filter(
                    CargoRequest.id.in_(used_demand_ids)
                ).update({"status": "PLANNED"}, synchronize_session=False)
                db.commit()
                logger.info(f"[planning] updated {len(used_demand_ids)} demands to PLANNED")
            
        except Exception as e:
            db.rollback()
            logger.error("[planning] failed to save plan", exc_info=True)

        # Include the saved plan ID in response
        if saved_plan_id:
            result.id = saved_plan_id
        
        return result

    except HTTPException:
        db.rollback()
        raise
    except ValueError as ve:
        db.rollback()
        msg = str(ve)
        if msg in ("graph_missing", "path_missing"):
            logger.error("Planning error", exc_info=True)
            raise HTTPException(status_code=400, detail="İstasyonlar arası yol bilgisi eksik. Lütfen km bağlantılarını kontrol edin.")
        logger.error("Planning error", exc_info=True)
        raise HTTPException(status_code=500, detail="Planlama sırasında hata oluştu. (Detaylar backend loglarında)")
    except Exception:
        db.rollback()
        logger.error("Planning error", exc_info=True)
        raise HTTPException(status_code=500, detail="Planlama sırasında hata oluştu. (Detaylar backend loglarında)")
    finally:
        db.close()


@app.get("/planning/latest", response_model=PlanningResponse)
def get_latest_plan(plan_date: Optional[str] = None, db: Session = Depends(get_db)):
    """Get the latest planning result for a given date (default: tomorrow)."""
    if not plan_date:
        plan_date_obj = datetime.utcnow().date() + timedelta(days=1)
    else:
        try:
            plan_date_obj = dt_date.fromisoformat(plan_date)
        except:
            raise HTTPException(status_code=400, detail="Geçersiz tarih formatı. YYYY-MM-DD kullanın.")
    
    plan = db.query(Plan).filter(
        Plan.plan_date == plan_date_obj
    ).order_by(Plan.created_at.desc()).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Bu tarih için plan bulunamadı.")
    
    return PlanningResponse(**plan.payload_json)


@app.get("/planning/last-result")
def get_last_planning_result(db: Session = Depends(get_db)):
    """Get the last planning result (regardless of date)."""
    plan = db.query(Plan).order_by(Plan.created_at.desc()).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Henüz planlama sonucu yok.")

    payload = plan.payload_json or {}

    vehicles_data = []
    vehicles = payload.get("vehicles", [])
    for idx, veh in enumerate(vehicles):
        stops = veh.get("stops", [])
        route_station_names = [s.get("station_name", "") for s in stops]
        vehicles_data.append({
            "name": veh.get("vehicle_id", f"Araç {idx + 1}"),
            "capacity_kg": veh.get("capacity_kg", 0),
            "distance_km": veh.get("total_km", 0),
            "load_kg": veh.get("load_kg", 0),
            "cost": veh.get("total_cost", 0),
            "stop_count": len(stops),
            "route_station_names": route_station_names,
        })

    response = {
        "total_cost": payload.get("total_cost", 0),
        "total_distance_km": payload.get("total_km", 0),
        "total_load_kg": payload.get("total_load_kg", 0),
        "vehicle_count": len(vehicles_data),
        "vehicles": vehicles_data,
    }

    return response


def _infer_mode(payload: Dict) -> str:
    """Infer mode from payload: FIXED if exactly 3 non-rental vehicles, else UNLIMITED."""
    vehicles = payload.get("vehicles", [])
    try:
        if len(vehicles) == 3 and all(not v.get("is_rental", False) for v in vehicles):
            return "FIXED"
        return "UNLIMITED"
    except Exception:
        return "UNLIMITED"


@app.get("/planning/runs")
def list_planning_runs(mode: Optional[str] = None, db: Session = Depends(get_db)):
    """List all planning runs ordered by creation time (newest first).
    
    Optional query parameter mode:
    - None or "all": all runs
    - "fixed": FIXED mode only
    - "unlimited": UNLIMITED mode only
    """
    try:
        rows = db.query(Plan).order_by(Plan.created_at.desc()).all()
        out: List[Dict] = []
        for row in rows:
            payload = row.payload_json or {}
            run_mode = _infer_mode(payload)
            
            # Apply mode filter
            if mode:
                mode_upper = mode.upper()
                if mode_upper in ("FIXED", "LIMITED"):
                    if run_mode != "FIXED":
                        continue
                elif mode_upper in ("UNLIMITED", "UNLIMITED"):
                    if run_mode != "UNLIMITED":
                        continue
                # else: "ALL" or empty = include all
            
            out.append({
                "id": int(row.id),
                "run_date": row.plan_date.isoformat() if row.plan_date else None,
                "total_cost": float(payload.get("total_cost") or 0.0),
                "vehicle_count": len(payload.get("vehicles", [])),
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "mode": run_mode,
            })
        return out
    except Exception:
        logger.error("[runs] list failed", exc_info=True)
        raise HTTPException(status_code=500, detail="Planlama kayıtları yüklenemedi.")


@app.get("/planning/runs/{run_id}", response_model=PlanningResponse)
def get_planning_run_details(run_id: int, db: Session = Depends(get_db)):
    """Get stored planning run details by ID."""
    plan = db.query(Plan).filter(Plan.id == run_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Planlama kaydı bulunamadı")
    return PlanningResponse(**(plan.payload_json or {}))


@app.delete("/planning/runs/{run_id}")
def delete_planning_run(run_id: int, db: Session = Depends(get_db)):
    """Delete a single planning run record.
    Returns { ok: true } or 404 if not found.
    """
    try:
        plan = db.query(Plan).filter(Plan.id == run_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")
        db.delete(plan)
        db.commit()
        return {"ok": True}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.error("[runs] delete failed", exc_info=True)
        raise HTTPException(status_code=500, detail="Silme işlemi başarısız.")


@app.delete("/planning/runs")
def delete_all_planning_runs(db: Session = Depends(get_db)):
    """Delete all planning run records.
    Returns { deleted_count: number }.
    """
    try:
        count = db.query(Plan).count()
        if count == 0:
            return {"deleted_count": 0}
        db.query(Plan).delete(synchronize_session=False)
        db.commit()
        return {"deleted_count": count}
    except Exception:
        db.rollback()
        logger.error("[runs] delete all failed", exc_info=True)
        raise HTTPException(status_code=500, detail="Silme işlemi başarısız.")


@app.get("/planning/runs/summary")
def get_planning_runs_summary(mode: Optional[str] = "ALL", db: Session = Depends(get_db)):
    """Get summary statistics for planning runs, grouped by mode.
    Returns aggregated data: count, avg_cost, avg_distance, avg_vehicle_count per mode.
    Respects the same mode filter as /planning/runs.
    """
    rows = db.query(Plan).order_by(Plan.created_at.desc()).all()

    def infer_mode(payload: Dict) -> str:
        vehicles = payload.get("vehicles", [])
        try:
            if len(vehicles) == 3 and all(not v.get("is_rental", False) for v in vehicles):
                return "FIXED"
            return "UNLIMITED"
        except Exception:
            return "UNLIMITED"

    # Aggregate by mode
    mode_data = {"FIXED": [], "UNLIMITED": []}
    for row in rows:
        payload = row.payload_json or {}
        m = infer_mode(payload)
        if mode and mode.upper() != "ALL":
            want = "FIXED" if mode.upper().startswith("FIX") else "UNLIMITED"
            if m != want:
                continue
        mode_data[m].append({
            "cost": float(payload.get("total_cost") or 0.0),
            "distance": float(payload.get("total_km") or 0.0),
            "vehicle_count": len(payload.get("vehicles", [])),
            "date": row.plan_date,
        })

    summary = []
    for mode_key, items in mode_data.items():
        if not items:
            continue
        count = len(items)
        avg_cost = sum(x["cost"] for x in items) / count
        avg_distance = sum(x["distance"] for x in items) / count
        avg_vehicle_count = sum(x["vehicle_count"] for x in items) / count
        summary.append({
            "mode": mode_key,
            "count": count,
            "avg_cost": round(avg_cost, 2),
            "avg_distance": round(avg_distance, 2),
            "avg_vehicle_count": round(avg_vehicle_count, 2),
        })

    return {"summary": summary, "total_runs": sum(len(v) for v in mode_data.values())}


# ===== User Route Endpoint =====

def _vehicle_label(vehicle_id: str, idx: int) -> str:
    try:
        if vehicle_id and vehicle_id.startswith("V"):
            num = int(vehicle_id[1:])
            return f"Araç {num}"
    except Exception:
        pass
    return f"Araç {idx + 1}"


@app.get("/user/route", response_model=UserRouteResponse)
def get_user_route(date: Optional[str] = None, request: Request = None, db: Session = Depends(get_db)):
    """Return the logged-in user's planned route for the given date.

    Uses header-based auth consistent with `/requests/me` (X-User-Email).
    Shows only stops where the user has PLANNED requests on that date.
    """
    user = get_user_by_header(request, db)

    # Determine date (default: tomorrow UTC date)
    if not date:
        plan_date_obj = datetime.utcnow().date() + timedelta(days=1)
    else:
        try:
            plan_date_obj = dt_date.fromisoformat(date)
        except Exception:
            raise HTTPException(status_code=400, detail="Geçersiz tarih formatı. YYYY-MM-DD olmalıdır.")

    # Find plan for that date
    plan_row = db.query(Plan).filter(Plan.plan_date == plan_date_obj).order_by(Plan.created_at.desc()).first()
    if not plan_row:
        # No planning for this date
        center_station = db.query(Station).filter(Station.is_center == True, Station.is_active == True).first()
        center_lat = center_station.lat if center_station else 39.0
        center_lon = center_station.lon if center_station else 35.0
        return {
            "date": plan_date_obj,
            "summary": {
                "total_distance_km": 0.0,
                "total_kg": 0.0,
                "total_piece": 0,
                "stop_count": 0,
            },
            "stops": [],
            "map": {
                "center": {"lat": center_lat, "lon": center_lon},
                "markers": [],
                "polylines": [],
            },
            "message": "Bu tarih için planlanmış rotanız yok.",
        }

    payload = plan_row.payload_json or {}
    vehicles = payload.get("vehicles", [])
    center_info = payload.get("center_station", {})
    center_id = int(center_info.get("id") or 0)
    center = db.query(Station).filter(Station.id == center_id).first()

    # Aggregate user's PLANNED requests at this date per station
    my_reqs = (
        db.query(CargoRequest)
        .filter(
            CargoRequest.user_id == user.id,
            CargoRequest.target_date == plan_date_obj,
            CargoRequest.status == "PLANNED",
        )
        .all()
    )

    if not my_reqs:
        # Planned run exists but user has no planned requests
        center_lat = center.lat if center else 39.0
        center_lon = center.lon if center else 35.0
        return {
            "date": plan_date_obj,
            "summary": {
                "total_distance_km": 0.0,
                "total_kg": 0.0,
                "total_piece": 0,
                "stop_count": 0,
            },
            "stops": [],
            "map": {
                "center": {"lat": center_lat, "lon": center_lon},
                "markers": [],
                "polylines": [],
            },
            "message": "Bu tarih için planlanmış rotanız yok.",
        }

    agg_by_station: Dict[int, Tuple[int, float]] = {}
    for r in my_reqs:
        piece, kg = agg_by_station.get(r.station_id, (0, 0.0))
        agg_by_station[r.station_id] = (piece + int(r.cargo_count or 0), kg + float(r.total_weight_kg or 0.0))

    # Build user-specific stops in the order of vehicle routes
    all_user_stops = []
    markers = []
    polylines = []
    total_distance_km = 0.0

    for v_idx, veh in enumerate(vehicles):
        veh_id = veh.get("vehicle_id") or f"V{v_idx + 1}"
        stops = veh.get("stops", []) or []
        # Filter stops for user's stations
        filtered = []
        for st in stops:
            sid = int(st.get("station_id"))
            if sid in agg_by_station and agg_by_station[sid][0] > 0:
                filtered.append(sid)

        if len(filtered) == 0:
            continue

        # Build route station ids including center at start/end
        route_station_ids = []
        if center_id:
            route_station_ids.append(center_id)
        route_station_ids.extend(filtered)
        if center_id:
            route_station_ids.append(center_id)

        # Compute distance for this user's trimmed route
        if len(route_station_ids) >= 2:
            for i in range(len(route_station_ids) - 1):
                try:
                    total_distance_km += float(get_distance(route_station_ids[i], route_station_ids[i + 1], db) or 0.0)
                except Exception:
                    # If distance cannot be computed, continue and rely on map polyline expansion
                    continue

        # Collect markers and stops list
        for order_idx, sid in enumerate(filtered, start=1):
            station_obj = db.query(Station).filter(Station.id == sid).first()
            piece, kg = agg_by_station.get(sid, (0, 0.0))
            all_user_stops.append({
                "order": order_idx,
                "station_id": sid,
                "station_name": station_obj.name if station_obj else f"Station {sid}",
                "total_piece": piece,
                "total_kg": kg,
                "eta_time": None,
            })
            if station_obj:
                markers.append({
                    "station_id": sid,
                    "name": station_obj.name,
                    "lat": station_obj.lat,
                    "lon": station_obj.lon,
                    "order": order_idx,
                })

        polylines.append({
            "vehicle_label": _vehicle_label(veh_id, v_idx),
            "station_ids": route_station_ids,
        })

    # Compute summary totals from aggregated stations actually in stops
    used_station_ids = set([m["station_id"] for m in markers])
    total_kg = 0.0
    total_piece = 0
    for sid in used_station_ids:
        piece, kg = agg_by_station.get(sid, (0, 0.0))
        total_piece += piece
        total_kg += kg

    center_lat = center.lat if center else 39.0
    center_lon = center.lon if center else 35.0

    return {
        "date": plan_date_obj,
        "summary": {
            "total_distance_km": round(total_distance_km, 3),
            "total_kg": round(total_kg, 3),
            "total_piece": int(total_piece),
            "stop_count": len(all_user_stops),
        },
        "stops": all_user_stops,
        "map": {
            "center": {"lat": center_lat, "lon": center_lon},
            "markers": markers,
            "polylines": polylines,
        },
        "message": None,
    }
