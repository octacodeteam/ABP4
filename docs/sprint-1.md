# 🏁 Relatório da Sprint 1

**Período:** 13/04/2026 a 30/04/2026  
**Status:** Concluída ✅

## 🎯 Objetivo da Sprint
Provar a viabilidade técnica inicial do projeto e construir a infraestrutura base de desenvolvimento, contemplando ambiente isolado (Docker), automação de checagens (CI/CD) e o esqueleto de comunicação do hardware com a API.

## 📉 Burndown Chart
<img width="733" height="443" alt="image" src="https://github.com/user-attachments/assets/a5248207-4f8b-4ecb-b856-a578b09eb798" />

## 🛠️ Entregas Realizadas

### 👑 Infraestrutura, Backend & QA
* **Setup do Projeto:** Inicialização do servidor Node.js utilizando TypeScript e Express para garantir tipagem estática e organização modular. *(RP01)*
* **Conteinerização:** Criação do arquivo `Dockerfile` para padronização do ambiente de execução do backend. *(RNF04, RP12)*
* **Pipeline de Integração Contínua (CI):** Configuração do GitHub Actions para rodar de forma automatizada o build da aplicação, checagem do linter e execução de testes a cada commit enviado. *(RNF02, RNF08)*
* **End-points de Validação:** Criação da rota básica de `health check` (`/health`) e de uma rota simulada (`POST /api/dispense`) para teste inicial de acionamento. *(RNF04, RP01)*
* **Suíte de Testes:** Configuração inicial do Jest e Supertest integrada ao pipeline para validação automatizada de rotas. *(RNF02, RNF10, RP10)*

### ⚙️ Hardware / IoT
* **Prototipagem em Bancada:** Montagem do circuito inicial utilizando o microcontrolador ESP32 conectado a um motor de passo para testes de rotação. *(RP02, RP08)*
* **Lógica de Conectividade:** Programação do firmware para conexão automática em rede Wi-Fi local e simulação de recepção de comandos via requisições HTTP. *(RP03)*

### 📱 Aplicativo Mobile
* **Arquitetura Base:** Inicialização do projeto front-end utilizando React Native (Expo), gerando a estrutura de diretórios limpa para o desenvolvimento das interfaces. *(RP04, RP05)*
