<p align="center">
  <img src="https://github.com/user-attachments/assets/da2c22a6-1fee-4c20-8ffc-9aa337d1a9ea" alt="gifgithubatualizado">
</p>

<div align="center">
  <strong>🇧🇷 Português</strong>
  &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="./README.en.md">🇺🇸 English</a>
</div>

<br>

<p align="center">
  <a href="#objetivo">Objetivo do Projeto</a> |
  <a href="#sprints">Sprints</a> |
  <a href="#backlog">Backlog & Artefatos</a> |
  <a href="#burndown">Burndown</a> |
  <a href="#produto">Sobre o Produto</a> |
  <a href="#metodologia">Metodologia</a> |
  <a href="#autores">Autores</a> |
  <a href="#tecnologias">Tecnologias</a>
</p>

---

<span id="objetivo"></span>

## 🎯 Objetivo do Projeto

Desenvolver um **Sistema Inteligente de Gerenciamento e Dispensação de Medicamentos com Integração IoT e Aplicativo Móvel**.

O sistema tem como foco auxiliar pacientes (especialmente idosos e pessoas com doenças crônicas) e seus cuidadores no acompanhamento contínuo da administração de medicamentos, garantindo a adesão ao tratamento e minimizando falhas.

A solução é composta por:

- 📱 **Aplicativo Móvel/Web** — Interface para cadastro de pacientes, medicamentos, cuidadores e configuração de alarmes e dosagens.
- ⚙️ **Backend e Nuvem** — API para gerenciamento das informações, com deploy automatizado, banco de dados seguro e pipeline de CI/CD.
- 🧩 **Dispositivo IoT (ESP32)** — Hardware inteligente responsável por dispensar fisicamente o medicamento no horário programado e emitir alertas sonoros/visuais.

---

<span id="sprints"></span>

## 📅 Sprints

| Links | Período | Status |
|:-----:|:-------:|:------:|
| [Sprint 1](https://github.com/octacodeteam/ABP4/tree/sprint-1) | 13/04/2026 – 30/04/2026 | Em Andamento ⏳ |
| [Sprint 2](https://github.com/octacodeteam/ABP4/tree/sprint-2) | 04/05/2026 – 21/05/2026 | A Fazer 📝 |
| [Sprint 3](https://github.com/octacodeteam/ABP4/tree/sprint-3) | 25/05/2026 – 11/06/2026 | A Fazer 📝 |

---

<span id="backlog"></span>

## 🌲 Backlog do Produto

### Requisitos Funcionais

| ID | Descrição |
|:--:|-----------|
| RF01 | O sistema deve permitir o cadastro de pacientes, cuidadores e médicos. |
| RF02 | O sistema deve permitir o registro de medicamentos, incluindo nome, dosagem, frequência e duração do tratamento. |
| RF03 | O aplicativo deve notificar o paciente e o cuidador no horário exato de tomar a medicação. |
| RF04 | O hardware IoT (ESP32) deve acionar a dispensação física do medicamento de acordo com o cronograma cadastrado no sistema. |
| RF05 | O sistema deve manter um histórico (log) das dispensações realizadas para acompanhamento de adesão ao tratamento. |

### Requisitos Não Funcionais

| ID | Descrição |
|:--:|-----------|
| RNF01 | **Pipeline Automatizado (CI/CD):** O projeto deve utilizar GitHub Actions para automação de testes e build. |
| RNF02 | **Testes Automatizados:** A aplicação deve contar com execução automatizada de testes integrada ao pipeline. |
| RNF03 | **Deploy Automatizado:** O backend e frontend devem ser implantados em ambiente de nuvem de forma automática. |
| RNF04 | **Conteinerização:** A solução deve utilizar containers (Docker) para padronização do ambiente de execução e banco de dados. |

### Restrições do Projeto

| ID | Descrição |
|:--:|-----------|
| R01 | O escopo do projeto deve ser viável dentro do tempo disponível para o semestre (ABP 4DSM). |
| R02 | O dispositivo físico IoT pode utilizar simulações ou protótipos em bancada (ESP32), desde que mantenha o modelo conceitual de dispensação. |

### Estórias de Usuário

| ID | Descrição |
|:--:|-----------|
| US01 | Como paciente idoso, quero receber um aviso sonoro no meu dispensador de remédios, para não me esquecer de tomar minha medicação. |
| US02 | Como cuidador, quero poder cadastrar os horários e doses dos remédios pelo celular, para gerenciar remotamente a saúde do meu familiar. |
| US03 | Como cuidador, quero receber um alerta caso o medicamento não seja retirado no horário programado, para poder intervir rapidamente. |
| US04 | Como médico, quero acessar um relatório de adesão ao tratamento, para saber se o paciente está seguindo a receita corretamente. |
| US05 | Como usuário, quero uma interface com botões grandes e leitura clara, para não ter dificuldades de utilizar o app. |

---

<span id="burndown"></span>

## 🔥 Burndown

<p align="center">
  <img src="https://github.com/octacodeteam/ABP4/blob/main/assets/Burndown_Sprint1.png" alt="Burndown Sprint 1">
</p>

> Os gráficos de burndown serão atualizados conforme o andamento das sprints.

---

<span id="produto"></span>

## 💡 Sobre o Produto

### Passo a Passo para Configurar o Ambiente de Desenvolvimento

**1. Clonar o Repositório**

```bash
git clone https://github.com/octacodeteam/ABP4.git
cd ABP4
```

**2. Configuração com Docker (Recomendado para o Banco de Dados)**

O backend utiliza um banco de dados que pode ser facilmente inicializado via Docker Compose.

```bash
cd backend
docker-compose up -d
```

**3. Instalar as Dependências do Backend**

Com o banco rodando, instale as dependências e execute as migrations do Prisma:

```bash
npm install
npx prisma migrate dev
npm run dev
```

O servidor estará disponível na porta `3000`.

**4. Instalar as Dependências do Frontend**

Abra um novo terminal, vá até a pasta do frontend e inicie o projeto:

```bash
cd ../frontend
npm install
npm run dev
```

Acesse o link gerado pelo Vite (normalmente `http://localhost:5173/`).

**5. Configuração do Hardware (ESP32)**

O código do dispositivo IoT está na pasta `arduino`. Para utilizá-lo:

- Abra o arquivo `arduino/medcare_esp32_dispenser.ino` na Arduino IDE.
- Instale as bibliotecas necessárias para ESP32 e conexão Wi-Fi.
- Ajuste as credenciais de rede e os endpoints da API no código-fonte antes de realizar o upload para a placa.

---

<span id="metodologia"></span>

## 📚 Metodologia

O projeto está sendo desenvolvido com a **metodologia ágil**, utilizando o framework **Scrum**.

- 📌 O trabalho é organizado em **sprints** curtas e incrementais.
- 👥 O time realiza alinhamentos constantes para garantir qualidade no código e na integração do hardware.
- 📝 As tarefas são organizadas no **backlog** e rastreadas no Trello.
- ✅ Há um fluxo completo de **Integração e Entrega Contínua (CI/CD)** para garantir o funcionamento da aplicação a cada nova atualização.

---

<span id="autores"></span>

## 👨‍💻 Autores

| Nome | Função | GitHub |
|------|--------|--------|
| Alisson Franco Gritti | Time de Dev | — |
| Georgia Mantchev | Product Owner | — |
| Gustavo Henrique Ferreira Hammes | Time de Dev | — |
| Igor Santos Lima | Time de Dev | — |

---

<span id="tecnologias"></span>

## 🔌 Tecnologias

> [!NOTE]
> Tecnologias e ferramentas utilizadas no desenvolvimento do hardware e software.

<!-- Adicione aqui os badges ou lista de tecnologias utilizadas -->