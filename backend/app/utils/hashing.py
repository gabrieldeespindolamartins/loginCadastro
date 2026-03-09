from bcrypt import hashpw, gensalt, checkpw
# gensalt() gera um sal aleatorio para randomizar o hash
# encode() transforma a string em bytes, decode() transforma bytes em strings

def hash_password(password: str) -> str: #função para receber a senha em texto e transformar em hash
    return hashpw(password.encode(), gensalt()).decode()

def verify_password(password: str, hash: str) -> bool: #funcao para verificar se a senha bate com o hash
    return checkpw(password.encode(), hash.encode()) 