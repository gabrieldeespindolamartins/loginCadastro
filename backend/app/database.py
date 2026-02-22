from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL) #faz conexao com o banco a partir da url do .env

SessionLocal = sessionmaker(bind=engine) #cria sessões quando for necessario conectar codigo ao banco

Base = declarative_base() #cria classes para os modelos da tabela

