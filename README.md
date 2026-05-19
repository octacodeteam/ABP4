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
| [Sprint 1](https://github.com/octacodeteam/ABP4/blob/main/docs/sprint-1.md) | 13/04/2026 – 30/04/2026 | Concluído ✅ |
| [Sprint 2](https://github.com/octacodeteam/ABP4/blob/main/docs/sprint-2.md) | 04/05/2026 – 21/05/2026 | Em Andamento ⏳ |
| [Sprint 3](https://github.com/octacodeteam/ABP4/blob/main/docs/sprint-3.md) | 25/05/2026 – 11/06/2026 | A Fazer 📝 |

---

<span id="backlog"></span>

## 🌲 Backlog do Produto

### Requisitos Funcionais
| ID | Descrição |
|:--:|-----------|
| RF01 | O sistema deve permitir o cadastro de medicamentos, contendo nome, dosagem, horários e compartimento físico associado. |
| RF02 | O sistema deve permitir a programação de múltiplos horários e intervalos de administração. |
| RF03 | O sistema deve permitir o cadastro de um ou mais responsáveis (cuidadores) para gestão remota. |
| RF04 | O dispositivo IoT deve liberar exclusivamente o compartimento correspondente ao horário e emitir um alerta sonoro. |
| RF05 | O sistema deve manter o registro de retiradas e notificar o aplicativo do responsável em caso de atraso/falha. |

### Requisitos Não Funcionais
| ID | Descrição |
|:--:|-----------|
| RNF01 | **Segurança & Nuvem:** A comunicação deve ser segura (JWT/HTTPS/MQTT) e os dados persistidos em nuvem. |
| RNF02 | **Pipeline Automatizado (CI/CD):** O GitHub Actions deve automatizar o Build, Linter (Qualidade) e Testes. |
| RNF03 | **Confiabilidade:** O hardware deve possuir armazenamento local/retry para falhas de conexão Wi-Fi e eficiência energética. |
| RNF04 | **Infraestrutura:** O backend (Node/TS) deve ser conteinerizado via Docker e possuir deploy automatizado. |

### Estórias de Usuário
| ID | Descrição |
|:--:|-----------|
| US01 | Como paciente idoso, quero receber um aviso sonoro no meu dispensador para não me esquecer de tomar a medicação. |
| US02 | Como cuidador, quero cadastrar os remédios e horários pelo celular para gerenciar o tratamento do meu familiar. |
| US03 | Como cuidador, quero receber uma notificação de alerta se o remédio não for retirado da caixa no tempo limite. |
| US04 | Como cuidador, quero acessar o histórico de logs do dispensador para acompanhar a adesão ao tratamento. |
| US05 | Como usuário, quero uma interface com botões grandes e leitura clara, pensada para acessibilidade. |

---

<span id="burndown"></span>

## 🔥 Burndown

<p align="center">
  <img width="733" height="443" alt="Burndown Sprint 1" src="https://github.com/user-attachments/assets/5505c8a2-afd9-4468-a98e-811cf137b094" />
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
| Alisson Franco Gritti | Time de Dev | <a href="https://github.com/alissonfatec"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a> |
| Breno de Luca | Scrum Master | <a href="https://github.com/brn-lc"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a> |
| Georgia Mantchev | Product Owner | <a href="https://github.com/Mantchev13"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a> |
| Gustavo Henrique Ferreira Hammes | Time de Dev | <a href="https://github.com/GustavoHammes"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a> |
| Igor Santos Lima | Time de Dev | <a href="https://github.com/IgorSantosL"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a> |

---

<span id="tecnologias"></span>

## 🔌 Tecnologias

> [!NOTE]
> Tecnologias e ferramentas utilizadas no desenvolvimento do hardware e software.

<!-- Adicione aqui os badges ou lista de tecnologias utilizadas -->
