from dotenv import load_dotenv #importa o dotenv que faz a ponte entre projeto e credenciais do env
import os #modulo usado para buscar os dados com getenv

load_dotenv() #le o env e carrega as variaveis

DATABASE_URL = os.getenv("DATABASE_URL") #url do banco
SECRET_KEY = os.getenv("SECRET_KEY") #chave secreta