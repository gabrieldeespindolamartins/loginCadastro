from sqlalchemy import Column, Integer, String, Boolean, DateTime #importa tipagem de dados e colunas
from sqlalchemy import func #importa a criação de funções
from app.database import Base #importa a base criada no database.py

class User(Base):
    __tablename__="users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())