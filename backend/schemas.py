from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import date, datetime

class RegisterRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "USER"

class LoginRequest(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    
    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenPayload(BaseModel):
    sub: int
    email: str
    role: str


class StationCreate(BaseModel):
    name: str
    lat: float
    lon: float
    
    @field_validator('name')
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('İstasyon adı boş olamaz')
        return v.strip()
    
    @field_validator('lat')
    @classmethod
    def lat_valid(cls, v: float) -> float:
        if v < -90 or v > 90:
            raise ValueError('Enlem -90 ile 90 arasında olmalıdır')
        return v
    
    @field_validator('lon')
    @classmethod
    def lon_valid(cls, v: float) -> float:
        if v < -180 or v > 180:
            raise ValueError('Boylam -180 ile 180 arasında olmalıdır')
        return v


class StationOut(BaseModel):
    id: int
    name: str
    lat: float
    lon: float
    is_active: bool
    
    class Config:
        from_attributes = True


class StationUpdate(BaseModel):
    name: str
    lat: float
    lon: float
    
    @field_validator('name')
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('İstasyon adı boş olamaz')
        return v.strip()
    
    @field_validator('lat')
    @classmethod
    def lat_valid(cls, v: float) -> float:
        if v < -90 or v > 90:
            raise ValueError('Enlem -90 ile 90 arasında olmalıdır')
        return v
    
    @field_validator('lon')
    @classmethod
    def lon_valid(cls, v: float) -> float:
        if v < -180 or v > 180:
            raise ValueError('Boylam -180 ile 180 arasında olmalıdır')
        return v


class StationActiveUpdate(BaseModel):
    is_active: bool


class CargoRequestCreate(BaseModel):
    station_id: int
    cargo_count: int
    total_weight_kg: float
    target_date: date

    @field_validator("cargo_count")
    @classmethod
    def cargo_count_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Kargo adedi 0'dan büyük olmalıdır")
        return v

    @field_validator("total_weight_kg")
    @classmethod
    def weight_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Toplam ağırlık 0'dan büyük olmalıdır")
        return v


class CargoRequestOut(BaseModel):
    id: int
    station_id: int
    station_name: str
    cargo_count: int
    total_weight_kg: float
    target_date: date
    status: str
    created_at: datetime
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


class DemandSummaryItem(BaseModel):
    station_id: int
    station_name: str
    total_count: int
    total_weight_kg: float


class DemandDetailItem(BaseModel):
    id: int
    user_email: str
    station_name: str
    cargo_count: int
    total_weight_kg: float
    status: str
    created_at: datetime
    target_date: date


class DemandsResponse(BaseModel):
    summary: List[DemandSummaryItem]
    details: List[DemandDetailItem]


# ===== Graph / Shortest Path Schemas =====

class StationEdgeCreate(BaseModel):
    from_station_id: int
    to_station_id: int
    distance_km: float
    is_bidirectional: bool = True
    
    @field_validator("distance_km")
    @classmethod
    def distance_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Mesafe 0'dan büyük olmalıdır")
        return v


class StationEdgeOut(BaseModel):
    id: int
    from_station_id: int
    to_station_id: int
    distance_km: float
    is_bidirectional: bool
    
    class Config:
        from_attributes = True


class ShortestPathResponse(BaseModel):
    from_station_id: int
    to_station_id: int
    total_distance_km: float
    path_station_ids: List[int]


class ExpandRouteRequest(BaseModel):
    """Request to expand a route using shortest paths between consecutive stations"""
    station_ids: List[int]  # e.g., [center_id, station_a_id, station_b_id, center_id]


class ExpandRouteResponse(BaseModel):
    """Response with fully expanded route including all intermediate stations"""
    expanded_station_ids: List[int]


class BuildMatrixResponse(BaseModel):
    pair_count: int
    updated_count: int

# ===== Planning Schemas =====

class PlanningStationStop(BaseModel):
    """A stop in the vehicle route"""
    station_id: int
    station_name: str
    demand_kg: float = 0.0
    cargo_count: int = 0


class PlanningVehicle(BaseModel):
    """A vehicle assignment in the plan"""
    vehicle_id: str
    capacity_kg: float
    is_rental: bool
    load_kg: float
    stops: List[PlanningStationStop]
    total_km: float
    total_cost: float


class PlanningRunRequest(BaseModel):
    """Request body for planning/run endpoint (from UI)"""
    mode: str  # "UNLIMITED_MIN_COST" or "FIXED_3_MAX_CARGO"
    km_unit_cost: float
    vehicle_capacities: List[int]  # [500, 750, 1000]
    rental_capacity: int
    rental_fixed_cost: float
    date: Optional[str] = None  # ISO format YYYY-MM-DD, defaults to tomorrow


class PlanningResponse(BaseModel):
    """Complete planning result for a date"""
    id: Optional[int] = None  # DB record ID after save
    date: date
    center_station: dict  # {id, name}
    km_unit_cost: float
    rental_fixed_cost: float
    vehicles: List[PlanningVehicle]
    total_cost: float
    total_km: float
    total_load_kg: float
    unserved_stations: List[dict]  # [{station_id, station_name, demand_kg}]


class PlanningRunSummary(BaseModel):
    """Summary row for runs history table"""
    id: int
    run_date: date
    mode: str  # "FIXED" or "UNLIMITED"
    total_cost: float
    vehicle_count: int
    created_at: datetime

# ===== User Route Schemas =====

class UserRouteStop(BaseModel):
    order: int
    station_id: int
    station_name: str
    total_piece: int
    total_kg: float
    eta_time: Optional[str] = None

class UserRouteSummary(BaseModel):
    total_distance_km: float
    total_kg: float
    total_piece: int
    stop_count: int

class UserRouteMapCenter(BaseModel):
    lat: float
    lon: float

class UserRouteMarker(BaseModel):
    station_id: int
    name: str
    lat: float
    lon: float
    order: int

class UserRoutePolyline(BaseModel):
    vehicle_label: str
    station_ids: List[int]

class UserRouteMap(BaseModel):
    center: UserRouteMapCenter
    markers: List[UserRouteMarker]
    polylines: List[UserRoutePolyline]

class UserRouteResponse(BaseModel):
    date: date
    summary: UserRouteSummary
    stops: List[UserRouteStop]
    map: UserRouteMap
    message: Optional[str] = None