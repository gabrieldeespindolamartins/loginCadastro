import jwt 
from datetime import datetime, timedelta, timezone
from app.config import settings

def create_user_token (date: dict) -> str: #cria a função de criar token e retorna string (não entendi os valores recebidos, talvez seja o formato da data)
    payload = data.copy() #copia o valor da data de criação 
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACESS_TOKEN_EXPIRE_MINUTES) #cria data de expiração, ainda não compreendi muito bem
    date.update({'exp': expire, 'type': 'access'}) #
    return jwt.encode(date, settings.SECRET_KEY, algorithm=settings.ALGORITHM) #