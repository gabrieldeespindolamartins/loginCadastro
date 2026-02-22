Caso o docker desligue o container, rode "docker-compose up -d" para subir novamente
    docker-compose up -d

para criar o venv no back:
    python -m venv venv

instalar as dependencias:
    pip install -r requirements.txt

Entra na pasta venv e executa o script para iniciar o ambiente venv
    cd backend
    .\venv\Scripts\activate

Sair do ambiente venv
    deactivate

Inicia o server (tem que ser dentro no venv!) - uvicorn inicia o server fast api, app.main:app indica o caminho 'pasta app -> arquivo main -> objeto app', --reload diz para o uvicorn atualizar o server automaticamente a cada alteração
    uvicorn app.main:app --reload  

Acessa o health (rota para verificar se o back esta on)
    http://localhost:8000/health

Acessa o swager (documentação automatica da api)
    http://localhost:8000/docs

Gerar migração com alembic
    alembic revision --autogenerate -m "mensagem estilo commit"