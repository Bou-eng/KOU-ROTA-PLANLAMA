from sqlalchemy import (
    Column,
    BigInteger,
    String,
    DateTime,
    Enum,
    Boolean,
    Float,
    Integer,
    Date,
    ForeignKey,
    func,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base
import enum
from datetime import datetime

Base = declarative_base()

class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "app"}
    
    id = Column(BigInteger, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Station(Base):
    __tablename__ = "stations"
    __table_args__ = {"schema": "app"}
    
    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_center = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class CargoRequest(Base):
    __tablename__ = "cargo_requests"
    __table_args__ = {"schema": "app"}

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("app.users.id"), nullable=False)
    station_id = Column(BigInteger, ForeignKey("app.stations.id"), nullable=False)
    cargo_count = Column(Integer, nullable=False)
    total_weight_kg = Column(Float, nullable=False)
    target_date = Column(Date, nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class StationEdge(Base):
    """
    Represents road connections between stations with distance.
    By default, edges are bidirectional (undirected graph).
    """
    __tablename__ = "station_edges"
    __table_args__ = (
        UniqueConstraint("from_station_id", "to_station_id", name="uq_station_edge"),
        CheckConstraint("distance_km > 0", name="ck_distance_positive"),
        {"schema": "app"}
    )
    
    id = Column(BigInteger, primary_key=True, index=True)
    from_station_id = Column(BigInteger, ForeignKey("app.stations.id", ondelete="CASCADE"), nullable=False)
    to_station_id = Column(BigInteger, ForeignKey("app.stations.id", ondelete="CASCADE"), nullable=False)
    distance_km = Column(Float, nullable=False)
    is_bidirectional = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class StationPathCache(Base):
    """
    Caches computed shortest paths between stations.
    Stores both distance and path as JSON array.
    """
    __tablename__ = "station_paths_cache"
    __table_args__ = {"schema": "app"}
    
    from_station_id = Column(BigInteger, primary_key=True)
    to_station_id = Column(BigInteger, primary_key=True)
    total_distance_km = Column(Float, nullable=False)
    path_station_ids_json = Column(JSONB, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class Plan(Base):
    """
    Stores planning/routing results for a specific date.
    """
    __tablename__ = "plans"
    __table_args__ = {"schema": "app"}
    
    id = Column(BigInteger, primary_key=True, index=True)
    plan_date = Column(Date, nullable=False, index=True)
    payload_json = Column(JSONB, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

