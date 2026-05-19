# ⚙️ Relatório da Sprint 2

**Período:** 04/05/2026 a 21/05/2026  
**Status:** Reta Final / Em Andamento ⏳

## 🎯 Objetivo da Sprint
Implementar as regras de negócio essenciais do sistema: persistência de dados em nuvem, controle de autenticação, operações de CRUD para medicamentos e agendamentos, além da integração dos sensores físicos de segurança (trava e alarme sonoro) no protótipo.

## 📉 Burndown Chart
<img width="812" height="466" alt="image" src="https://github.com/user-attachments/assets/08016e7a-5fdc-4806-a148-14a48bb00207" />

> **Nota de Gestão (Scrum Master):** Durante o meio da sprint, o gráfico apresentou um platô de estagnação devido à reestruturação interna da equipe. As tarefas de Qualidade (QA) e Documentação foram redistribuídas entre os membros da equipe, resultando na recuperação do ritmo de entrega na reta final da sprint.

## 🛠️ Entregas por Frente

### 👑 Infraestrutura, Backend & QA
* **Modelagem do Banco de Dados:** Estruturação das entidades de Cuidadores/Responsáveis, Medicamentos e Logs de Dispensação em banco de dados hospedado na nuvem. *(RF01, RF02, RF03, RF05, RNF01)*
* **Segurança:** Implementação do sistema de autenticação via tokens JWT e proteção de rotas privadas na API. *(RNF01)*
* **Endpoints de Negócio:** Desenvolvimento do CRUD completo para gerenciamento de medicamentos (nome, dosagem, frequência, compartimento). *(RF01, RF02)*
* **Sincronização IoT:** Criação da rota receptora para o hardware registrar os logs de abertura de compartimento em tempo real. *(RF05)*
* **Garantia de Qualidade (QA):** Escrita de testes automatizados de integração utilizando Jest e Supertest para blindar as novas rotas de CRUD criadas. *(RNF02)*

### ⚙️ Hardware / IoT
* **Evolução Física:** Integração do sensor magnético de abertura (Reed Switch) e do alarme sonoro (Buzzer) na estrutura do carrossel. *(RF04, RP02)*
* **Lógica de Controle:** Programação do ESP32 para verificar os horários cronometrados, emitir o alerta sonoro e girar o motor de passo exatamente para o slot correspondente ao medicamento. *(RF04)*
* **Comunicação Ativa:** Implementação da rotina de comunicação (HTTP/MQTT) para notificar o backend no momento em que a tampa do compartimento for aberta pelo usuário. *(RF05)*

### 📱 Aplicativo Mobile & Documentação
* **Telas de Acesso:** Desenvolvimento das interfaces de Login e Cadastro do Responsável/Cuidador. *(RF03)*
* **Gerenciamento Remoto:** Construção da tela de listagem e formulário de agendamento de doses consumindo os dados da API. *(US02)*
* **Acessibilidade Base:** Ajustes de design com foco em componentes visuais de leitura simplificada e botões amplos. *(RNF04, US05)*
* **Artefatos Técnicos:** Desenho e mapeamento dos Diagramas de Casos de Uso detalhando a jornada do responsável e a interação com o ecossistema conectado. *(RP07)*


