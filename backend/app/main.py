from fastapi import FastAPI #importa fastapi

app = FastAPI() #inicia a aplicação backend

@app.get("/health") #define a rota ao fastapi
def health_check(): #cria a funcao da rota
    return {"status": "ok"} #retorna a ação