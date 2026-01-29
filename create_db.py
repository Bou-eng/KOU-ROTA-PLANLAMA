import psycopg2
import sys

try:
    # Try to connect as postgres superuser (no password first)
    try:
        conn = psycopg2.connect('dbname=postgres user=postgres host=localhost')
        print('✓ Connected as postgres superuser')
    except:
        # Fallback to yazlab_user
        conn = psycopg2.connect('dbname=postgres user=yazlab_user password=123456 host=localhost')
        print('✓ Connected as yazlab_user')
    
    conn.autocommit = True
    cur = conn.cursor()
    
    # Check if database exists
    cur.execute("SELECT 1 FROM pg_database WHERE datname='yazlab3'")
    if cur.fetchone():
        print('✓ Database yazlab3 already exists')
    else:
        cur.execute('CREATE DATABASE yazlab3')
        print('✓ Database yazlab3 created successfully')
    
    # Create schema and table in yazlab3 database
    try:
        conn.close()
    except:
        pass
    
    conn = psycopg2.connect('dbname=yazlab3 user=yazlab_user password=123456 host=localhost')
    conn.autocommit = True
    cur = conn.cursor()
    
    # Create schema
    cur.execute('CREATE SCHEMA IF NOT EXISTS app')
    print('✓ Schema app created')
    
    # Create users table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS app.users (
            id BIGSERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'USER',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print('✓ Table app.users created')
    
    cur.close()
    conn.close()
    print('✓ All done! Database is ready.')
    
except psycopg2.errors.DuplicateDatabase:
    print('✓ Database yazlab3 already exists')
    try:
        conn.close()
    except:
        pass
    
    # Still create the table if it doesn't exist
    conn = psycopg2.connect('dbname=yazlab3 user=yazlab_user password=123456 host=localhost')
    conn.autocommit = True
    cur = conn.cursor()
    
    cur.execute('CREATE SCHEMA IF NOT EXISTS app')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS app.users (
            id BIGSERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'USER',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cur.close()
    conn.close()
    print('✓ All done! Database is ready.')
    
except Exception as e:
    print(f'✗ Error: {type(e).__name__}: {e}')
    sys.exit(1)
