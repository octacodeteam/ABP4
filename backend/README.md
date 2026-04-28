# MedCare IoT Backend

Backend Express/TypeScript baseado no ABP4 original e expandido para autenticação, pacientes, medicamentos, preferências, histórico, alertas e comando de dispensação.

## Rodar

```bash
npm install
copy .env.example .env
npm run dev
```

No Linux/macOS:

```bash
cp .env.example .env
npm run dev
```

URL padrão:

```txt
http://localhost:3001
```

## Persistência

O arquivo `data/db.json` é criado automaticamente na primeira execução.
