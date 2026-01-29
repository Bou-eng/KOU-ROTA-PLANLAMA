#!/usr/bin/env python
"""
Simple migration script to create Plan table if not exists
"""
import os
import sys
from dotenv import load_dotenv

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

from sqlalchemy import text, create_engine
from app.models import Base, Plan

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://yazlab3_app:123456@localhost:5432/yazlab3_new")

engine = create_engine(DATABASE_URL)

# Create Plan table
Base.metadata.create_all(engine, tables=[Plan.__table__])

print("✓ Plan table created successfully")
