# Update script to add station endpoints to main.py
import re

# Read the file
with open('c:/Users/Ebu-l Emin/Desktop/Yazlab3/apps/api/app/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Update imports
content = content.replace(
    'from app.models import User, UserRole',
    'from app.models import User, UserRole, Station'
)
content = content.replace(
    'from app.schemas import RegisterRequest, LoginRequest, UserOut, LoginResponse',
    'from app.schemas import RegisterRequest, LoginRequest, UserOut, LoginResponse, StationCreate, StationOut'
)
content = content.replace(
    'from sqlalchemy import text',
    'from sqlalchemy import text, func'
)

# Add require_admin function after get_current_user
require_admin_func = '''
# Dependency to require ADMIN role
def require_admin(user: User = Depends(get_current_user)) -> User:
    """Ensure current user is ADMIN."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yönetici yetkisi gerekli."
        )
    return user
'''

# Find position after get_current_user function and add require_admin
pattern = r'(    return user\n\n)(# Routes)'
content = re.sub(pattern, r'\1' + require_admin_func + r'\n\2', content)

# Add station endpoints before if __name__
station_endpoints = '''
# Station endpoints
@app.get("/stations", response_model=list[StationOut])
def get_stations(db: Session = Depends(get_db)):
    """Get all active stations (public endpoint)."""
    stations = db.query(Station).filter(Station.is_active == True).all()
    logger.info(f"Fetched {len(stations)} active stations")
    return stations

@app.post("/admin/stations", response_model=StationOut)
def create_station(req: StationCreate, user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Create a new station (ADMIN only)."""
    logger.info(f"Admin {user.email} creating station: {req.name}")
    
    # Check if station name already exists (case-insensitive)
    existing = db.query(Station).filter(func.lower(Station.name) == func.lower(req.name)).first()
    if existing:
        logger.warning(f"Station name already exists: {req.name}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu istasyon adı zaten kullanımda."
        )
    
    try:
        new_station = Station(
            name=req.name,
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
        logger.error(f"Error creating station: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="İstasyon oluşturulurken bir hata oluştu."
        )

'''

# Add before if __name__
content = content.replace('\nif __name__ == "__main__":', '\n' + station_endpoints + 'if __name__ == "__main__":')

# Write updated file
with open('c:/Users/Ebu-l Emin/Desktop/Yazlab3/apps/api/app/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("main.py updated successfully!")
