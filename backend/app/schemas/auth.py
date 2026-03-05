from pydantic import BaseModel, ConfigDict, Field, EmailStr #importa modelo base para herdar e configurações, field para qMin de campos e emailStr para campo email

class UserCreate(BaseModel): #herda de basemodel e define contratos para criação de usuario
    name: str = Field(min_length=1) #fild define o minimo de caracteres no campo
    email: EmailStr
    password: str = Field(min_length=8)
    
class UserResponse(BaseModel): #define reposta do usuario para api, não mostra senha e demonstra se o usuario é verificado
    id: int
    name: str
    email: EmailStr
    is_verified: bool
    
    model_config = ConfigDict(from_attributes=True) #faz o pydantic conseguir ler informações do banco
    
class UserLogin(BaseModel): #usado nos campos de login pelo usuario
    email: EmailStr
    password: str = Field(min_length=8)
    
class TokenResponse(BaseModel): #define a estrutura de resposta caso o login seja validado. Envia o token de acesso curto e um token de renovar sessão
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    