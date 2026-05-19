# 🚀 Relatório da Sprint 3

**Período:** 25/05/2026 a 11/06/2026  
**Status:** A Fazer 📝

## 🎯 Objetivo da Sprint
Finalizar o sistema com foco em resiliência offline para o hardware, monitoramento inteligente de atrasos na medicação com disparo de Notificações Push, polimento total de acessibilidade na interface mobile para o público idoso, deploy automatizado na nuvem e consolidação da documentação arquitetural.

## 📉 Burndown Chart
*(Espaço reservado para o gráfico de Burndown que será gerado ao longo da Sprint 3)*

## 🛠️ Planejamento de Entregas

### 👑 Infraestrutura, Backend & QA
* **Deploy Automatizado:** Configuração do pipeline de CD para publicação e atualização automática da API conteinerizada (Docker) em ambiente de nuvem estável. *(RNF04)*
* **Motor de Notificações:** Integração com o serviço de mensageria para disparo de alertas Push direcionados ao aplicativo móvel. *(RF05)*
* **Monitoramento de Atrasos:** Desenvolvimento da lógica de verificação de tempo limite no servidor (caso o remédio não seja retirado dentro da janela estipulada pós-alerta). *(RF05)*
* **Documentação Geral:** Finalização da documentação arquitetural do sistema distribuído e fechamento dos diagramas de componentes da solução. *(RP07)*

### ⚙️ Hardware / IoT
* **Resiliência Offline:** Programação de armazenamento local no ESP32 (SPIFFS ou Preferences.h) para guardar o cronograma de horários de forma persistente, permitindo que o dispensador funcione mesmo em caso de queda de conexão Wi-Fi. *(RNF03)*
* **Eficiência Energética:** Implementação do modo de economia de energia (*Deep Sleep*) do microcontrolador entre os intervalos de alarmes. *(RNF03)*
* **Documentação de Redes:** Redação do relatório técnico detalhando as especificações de comunicação (JSONs, payloads e tópicos/verbos) utilizados na integração IoT-Servidor. *(RP07)*

### 📱 Aplicativo Mobile
* **Alertas em Tempo Real:** Implementação do recebimento e tratamento de Notificações Push para avisar o cuidador sobre o horário do remédio ou sobre alertas de atraso. *(RF05, US03)*
* **Linha do Tempo (Log):** Criação da tela de visualização do histórico consolidado de administrações e aberturas do dispensador. *(RF05, US04)*
* **Acessibilidade Estrita:** Ajuste fino da UI/UX aplicando técnicas de alto contraste, fontes escaláveis e botões grandes projetados para facilitar o manuseio por usuários idosos. *(RNF04, US05)*
* **Testes de Interface:** Escrita de testes unitários para os componentes do front-end móvel em React Native. *(RNF02)*
