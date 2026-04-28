# MedCare IoT — Projeto Integrado Frontend + Backend

Projeto montado a partir dos dois ZIPs enviados:

- `ABP4.zip`: backend Express/TypeScript original.
- ZIP do AI Studio: frontend React/Vite original.

A estrutura final ficou como um monorepo simples:

```txt
medcare-iot-integrado/
  backend/
    src/server.ts
    data/db.json             # criado automaticamente na primeira execução
    package.json
    .env.example
  frontend/
    src/
      App.tsx
      api.ts
      types.ts
      components/
    package.json
    .env.example
```

## O que foi mantido

Do frontend do AI Studio, foram mantidos a identidade visual, a navegação principal e as telas de:

- Dashboard/Início
- Histórico
- Novo Remédio
- Paciente+
- Alertas
- Perfil/Preferências
- Login simplificado do paciente

Do backend ABP4, foi mantida a base Express/TypeScript, a rota `/health` e a rota `/api/dispense`, agora expandida para registrar a dispensação e retornar o comando esperado pelo dispositivo.

## O que foi implementado

### Login do cuidador

O cuidador entra com:

- email
- senha

Endpoints:

```txt
POST /api/auth/caregiver/register
POST /api/auth/caregiver/login
```

### Login do paciente

O paciente entra com:

- telefone do cuidador
- PIN de 4 dígitos criado pelo cuidador

Endpoint:

```txt
POST /api/auth/patient/login
```

### Regra de vínculo

- Um cuidador pode ter vários pacientes.
- Um paciente pertence a apenas um cuidador.

Isso é garantido no backend pelo campo `caregiverId` dentro do paciente.

### Funcionalidades conectadas

O frontend agora consome o backend para:

- cadastrar cuidador
- fazer login como cuidador
- fazer login como paciente
- cadastrar pacientes
- cadastrar medicamentos
- calcular próxima dose
- montar plano de abastecimento das 7 gavetas
- listar histórico
- listar alertas
- salvar preferências do paciente
- enviar comando de dispensação manual para `/api/dispense`

## Dados demo

Na primeira execução, o backend cria automaticamente um arquivo `backend/data/db.json` com dados de demonstração.

### Cuidador demo

```txt
Email: cuidador@demo.com
Senha: 123456
Telefone: 11999999999
```

### Paciente demo

```txt
Telefone do cuidador: 11999999999
PIN do paciente: 1234
```

## Como rodar o backend

Abra um terminal na pasta do backend:

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

No Linux/macOS, use:

```bash
cp .env.example .env
```

O backend vai rodar em:

```txt
http://localhost:3001
```

Teste rápido:

```bash
curl http://localhost:3001/health
```

## Como rodar o frontend

Abra outro terminal na pasta do frontend:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

No Linux/macOS, use:

```bash
cp .env.example .env
```

O frontend vai rodar em:

```txt
http://localhost:3000
```

## Rotas principais do backend

```txt
GET  /health
POST /api/auth/caregiver/register
POST /api/auth/caregiver/login
POST /api/auth/patient/login
GET  /api/me
GET  /api/patients
POST /api/patients
GET  /api/patients/:patientId/dashboard
GET  /api/patients/:patientId/medications
POST /api/patients/:patientId/medications
GET  /api/patients/:patientId/history
GET  /api/patients/:patientId/alerts
GET  /api/patients/:patientId/preferences
PUT  /api/patients/:patientId/preferences
POST /api/dispense
```

## Observação importante sobre banco de dados

Para manter o projeto simples e funcionando sem dependências adicionais, usei persistência em arquivo JSON no backend:

```txt
backend/data/db.json
```

Isso é suficiente para apresentação, protótipo e validação da integração frontend/backend. Para produção, o próximo passo correto é trocar essa persistência por PostgreSQL, Prisma ou outro banco relacional.

## Próximos passos recomendados

1. Trocar o `db.json` por banco real.
2. Criar tabela de dispositivo físico/ESP32 por paciente.
3. Criar fila de comandos para o hardware buscar o próximo comando pendente.
4. Adicionar confirmação real de retirada do medicamento.
5. Adicionar edição/exclusão de medicamentos e pacientes.
