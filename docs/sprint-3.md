# 🚀 Relatório da Sprint 3

**Período:** 25/05/2026 a 11/06/2026  
**Status:** A Fazer 📝

## 🎯 Objetivo da Sprint
Finalizar o sistema com foco em resiliência offline para o hardware, monitoramento inteligente de atrasos na medicação com disparo de Notificações Push, polimento de acessibilidade na interface mobile para o público idoso, deploy automatizado na nuvem e consolidação da documentação arquitetural.

## 📉 Burndown Chart
*(Espaço reservado para o gráfico de Burndown que será gerado ao longo da Sprint 3)*

## 🛠️ Planejamento de Entregas

### 👑 Infraestrutura, Backend & QA
* **Deploy Automatizado:** Configuração do pipeline de CD para publicação e atualização automática da API conteinerizada (Docker) em ambiente de nuvem estável (ex: Railway/Render). *(RNF03, RNF04)*
* **Motor de Notificações:** Integração com o serviço Firebase Cloud Messaging (FCM) para disparo de alertas Push. *(RF03)*
* **Monitoramento de Atrasos:** Desenvolvimento da lógica de *Timeout* no servidor (caso o remédio não seja retirado dentro da janela estipulada, gera o alerta de não-retirada). *(US03)*
* **Relatórios Médicos:** Criação do endpoint para compilar dados históricos e gerar o relatório consolidado de adesão ao tratamento. *(US04)*
* **Documentação Geral:** Finalização da documentação arquitetural do sistema distribuído e fechamento dos diagramas de componentes da solução. *(Restrição de Projeto)*

### ⚙️ Hardware / IoT
* **Resiliência Offline:** Programação de armazenamento local no ESP32 (SPIFFS ou Preferences.h) para guardar o cronograma de horários de forma persistente, permitindo que o dispensador funcione mesmo em caso de queda de conexão Wi-Fi. *(Restrição de Projeto)*
* **Eficiência Energética:** Implementação do modo de economia de energia (*Deep Sleep*) do microcontrolador entre os intervalos de alarmes.
* **Documentação de Redes:** Redação do relatório técnico detalhando as especificações de comunicação (JSONs, payloads e verbos HTTP) utilizados na integração IoT-Servidor. *(Restrição de Projeto)*

### 📱 Aplicativo Mobile
* **Alertas em Tempo Real:** Implementação do recebimento e tratamento de Notificações Push para avisar o cuidador sobre o horário do remédio ou sobre alertas de atraso. *(RF03, US03)*
* **Visão Clínica:** Criação da tela de visualização do relatório de adesão voltada para o perfil do Médico. *(US04)*
* **Acessibilidade Estrita:** Ajuste fino da UI/UX aplicando técnicas de alto contraste, fontes escaláveis e botões grandes projetados para usuários idosos. *(US05)*
* **Testes de Interface:** Escrita de testes unitários para os componentes do front-end móvel em React Native. *(RNF02)*
