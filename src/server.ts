// src/server.ts
import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rota 1: Health Check (Validação de CI/CD e Infra)
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', message: 'Servidor rodando liso!' });
});

// Rota 2: Prova de Conceito IoT (Sprint 1)
app.post('/api/dispense', (req: Request, res: Response) => {
    // Na Sprint 2 isso vai gravar no banco. Hoje, só precisa responder pro ESP32.
    console.log('Comando de dispensação recebido do App!');

    // Resposta que o ESP32 vai ler para girar o motor
    res.status(200).json({
        success: true,
        command: 'GIRAR_MOTOR',
        angulo: 45
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend iniciado na porta ${PORT}`);
});