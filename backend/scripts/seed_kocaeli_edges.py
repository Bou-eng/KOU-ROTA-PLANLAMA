"""
Seed script for Kocaeli districts road network graph.
Populates app.station_edges with distance data between districts.

Usage:
    python seed_kocaeli_edges.py

Environment:
    DATABASE_URL (optional): postgresql+psycopg2://user:pass@host:5432/db
    Default: postgresql+psycopg2://yazlab3_app:123456@localhost:5432/yazlab3_new
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# District names (case-insensitive matching)
DISTRICT_NAMES = [
    "Darıca", "Çayırova", "Gebze", "Dilovası", "Körfez", 
    "Derince", "İzmit", "Kartepe", "Kandıra", "Başiskele", 
    "Gölcük", "Karamürsel"
]

# Edge list: (district1, district2, distance_km)
EDGES = [
    ("Darıca", "Çayırova", 8),
    ("Darıca", "Gebze", 9),
    ("Çayırova", "Gebze", 6),
    ("Gebze", "Dilovası", 14),
    ("Dilovası", "Körfez", 25),
    ("Körfez", "Derince", 9),
    ("Derince", "İzmit", 14),
    ("İzmit", "Kartepe", 9),
    ("İzmit", "Kandıra", 45),
    ("İzmit", "Başiskele", 23),
    ("Başiskele", "Gölcük", 22),
    ("Gölcük", "Karamürsel", 26),
]

def main():
    # Get database URL
    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://yazlab3_app:123456@localhost:5432/yazlab3_new"
    )
    
    print("=" * 70)
    print("Kocaeli Road Network Seed")
    print("=" * 70)
    print(f"\nDatabase: {db_url.split('@')[1] if '@' in db_url else '...'}")
    
    # Create engine
    try:
        engine = create_engine(db_url)
        Session = sessionmaker(bind=engine)
        session = Session()
        print("✓ Database connection OK")
    except Exception as e:
        print(f"✗ Database connection failed: {str(e)}")
        sys.exit(1)
    
    # Step 1: Find station IDs
    print("\n[1] Looking up station IDs...")
    station_map = {}
    
    try:
        for district_name in DISTRICT_NAMES:
            result = session.execute(
                text("""
                    SELECT id, name FROM app.stations 
                    WHERE LOWER(name) = LOWER(:name) AND is_active = TRUE
                """),
                {"name": district_name}
            )
            row = result.fetchone()
            
            if row:
                station_id, name = row
                station_map[district_name] = station_id
                print(f"   ✓ {district_name:15} → ID {station_id}")
            else:
                print(f"   ✗ {district_name:15} → NOT FOUND")
        
        if len(station_map) != len(DISTRICT_NAMES):
            missing = [d for d in DISTRICT_NAMES if d not in station_map]
            print(f"\n✗ Error: Şu ilçeler bulunamadı: {', '.join(missing)}")
            session.close()
            sys.exit(1)
        
        print(f"\n✓ Tüm {len(station_map)} ilçe bulundu")
        
    except Exception as e:
        print(f"✗ Error looking up stations: {str(e)}")
        session.close()
        sys.exit(1)
    
    # Step 2: Prepare edges (normalize to from < to)
    print("\n[2] Preparing edges...")
    edges_to_insert = []
    
    for dist1, dist2, distance_km in EDGES:
        id1 = station_map[dist1]
        id2 = station_map[dist2]
        
        # Normalize: from_id should be < to_id to avoid duplicates
        from_id = min(id1, id2)
        to_id = max(id1, id2)
        
        edges_to_insert.append({
            "from_id": from_id,
            "to_id": to_id,
            "distance_km": distance_km,
            "dist1_name": dist1,
            "dist2_name": dist2,
        })
        
        print(f"   {dist1:15} ↔ {dist2:15} : {distance_km:2.0f} km " +
              f"(IDs: {from_id} ↔ {to_id})")
    
    # Step 3: Insert/Update edges
    print(f"\n[3] Inserting/updating {len(edges_to_insert)} edges...")
    
    inserted_count = 0
    updated_count = 0
    
    try:
        for edge in edges_to_insert:
            # Check if edge exists
            result = session.execute(
                text("""
                    SELECT id FROM app.station_edges 
                    WHERE from_station_id = :from_id AND to_station_id = :to_id
                """),
                {
                    "from_id": edge["from_id"],
                    "to_id": edge["to_id"]
                }
            )
            existing = result.fetchone()
            
            if existing:
                # Update existing edge
                session.execute(
                    text("""
                        UPDATE app.station_edges 
                        SET distance_km = :distance_km, is_bidirectional = TRUE
                        WHERE from_station_id = :from_id AND to_station_id = :to_id
                    """),
                    {
                        "from_id": edge["from_id"],
                        "to_id": edge["to_id"],
                        "distance_km": edge["distance_km"]
                    }
                )
                updated_count += 1
            else:
                # Insert new edge
                session.execute(
                    text("""
                        INSERT INTO app.station_edges 
                        (from_station_id, to_station_id, distance_km, is_bidirectional, created_at)
                        VALUES (:from_id, :to_id, :distance_km, TRUE, now())
                    """),
                    {
                        "from_id": edge["from_id"],
                        "to_id": edge["to_id"],
                        "distance_km": edge["distance_km"]
                    }
                )
                inserted_count += 1
        
        session.commit()
        print(f"   ✓ Eklendi: {inserted_count}, Güncellendi: {updated_count}")
        
    except Exception as e:
        session.rollback()
        print(f"   ✗ Hata: {str(e)}")
        session.close()
        sys.exit(1)
    
    # Step 4: Verify
    print("\n[4] Verification...")
    try:
        result = session.execute(
            text("SELECT COUNT(*) FROM app.station_edges")
        )
        total_edges = result.scalar()
        print(f"   ✓ Toplam edge sayısı: {total_edges}")
        
    except Exception as e:
        print(f"   ⚠ Verification error: {str(e)}")
    
    session.close()
    
    print("\n" + "=" * 70)
    print("✓ SEED BAŞARILI")
    print("=" * 70)
    print("\nSonraki adımlar:")
    print("1. Backend'i başlat (sunucu çalışıyorsa zaten hazır)")
    print("2. Distance matrix'i oluştur: POST /graph/build-matrix")
    print("3. En kısa yolu test et: GET /graph/shortest-path")
    print("=" * 70)

if __name__ == "__main__":
    main()
