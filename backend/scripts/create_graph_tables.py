"""
Create graph tables using SQLAlchemy ORM.
This uses the existing models to create the new tables.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.db import engine
from backend.models import Base

def create_graph_tables():
    """Create the graph-related tables using SQLAlchemy."""
    print("Creating graph tables using SQLAlchemy...")
    print(f"Database: {engine.url}")
    
    try:
        # Create only the new tables
        # This will check if tables exist and create only missing ones
        Base.metadata.create_all(bind=engine, checkfirst=True)
        print("\n✓ Tables created successfully!")
        
        # Verify tables exist
        from sqlalchemy import inspect
        inspector = inspect(engine)
        
        print("\nVerifying tables in schema 'app':")
        tables = inspector.get_table_names(schema='app')
        
        graph_tables = ['station_edges', 'station_paths_cache']
        for table_name in graph_tables:
            if table_name in tables:
                print(f"  ✓ {table_name}")
            else:
                print(f"  ✗ {table_name} NOT FOUND")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = create_graph_tables()
    sys.exit(0 if success else 1)
