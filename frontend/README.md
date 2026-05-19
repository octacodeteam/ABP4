# MedCare IoT Frontend

Frontend React/Vite preservado a partir do projeto do AI Studio e conectado ao backend Express.

## O que a interface consome do backend

A interface agora chama o backend para:

- cadastro do cuidador;
- login do cuidador;
- login do paciente com telefone do cuidador + PIN;
- validação da sessão salva;
- listagem e cadastro de pacientes;
- listagem, cadastro e inativação de medicamentos;
- dashboard com próxima dose, dispositivo e plano de abastecimento;
- confirmação do abastecimento físico;
- comando manual de dispensação para o ESP32;
- histórico real dos compartimentos;
- alertas reais/automáticos;
- preferências do paciente.

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
http://localhost:3000
```

## Variável de ambiente

```txt
VITE_API_BASE_URL=http://localhost:3001
```

> Não use `/api` no final da variável. O arquivo `src/api.ts` já monta as rotas começando com `/api/...`.
