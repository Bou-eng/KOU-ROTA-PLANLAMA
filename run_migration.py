"""
Run the SQL migration to create graph tables.
"""
import psycopg2
from pathlib import Path

# Database connection
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "yazlab3_new",
    "user": "yazlab3_app",
    "password": "123456"
}

def run_migration():
    """Execute the SQL migration file."""
    sql_file = Path(__file__).parent / "db" / "create_graph_tables.sql"
    
    print(f"Reading SQL from: {sql_file}")
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print("\nConnecting to database...")
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    try:
        print("Executing migration...")
        cursor.execute(sql_content)
        conn.commit()
        print("\n✓ Migration completed successfully!")
        
        # Verify tables exist
        print("\nVerifying tables...")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'app' 
            AND table_name IN ('station_edges', 'station_paths_cache')
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        for table in tables:
            print(f"  ✓ {table[0]}")
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ Error: {str(e)}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
