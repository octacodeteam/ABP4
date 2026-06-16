<p align="center">
  <img src="https://github.com/user-attachments/assets/7927d3d7-0b1e-4d83-a8bc-35a51a073401" alt="Octacode_Header">
</p>

<div align="center">
  <strong>🇧🇷 Português</strong>
</div>

<br>

<p align="center">
  <a href="#objetivo">Objetivo do Projeto</a> |
  <a href="#sprints">Sprints</a> |
  <a href="#backlogArtefatos">Backlog & Artefatos</a> |
  <a href="#visao">Configuração & Execução</a> |
  <a href="#metodologia">Metodologia</a> |
  <a href="#autores">Autores</a> |
  <a href="#tecnologias">Tecnologias</a>
</p>

<br>

<span id="objetivo"></span>

## 🎯 Objetivo do Projeto  

Desenvolver um Sistema Inteligente de Gerenciamento e Dispensação de Medicamentos com Integração IoT e Aplicativo Móvel.

O envelhecimento da população e o aumento da incidência de doenças crônicas têm elevado significativamente o número de pessoas que necessitam de acompanhamento contínuo na administração de medicamentos. O desafio proposto consiste no desenvolvimento de um sistema integrado composto por um dispositivo físico (caixa organizadora de medicamentos) baseado em Internet das Coisas (IoT), um servidor em nuvem e um aplicativo para dispositivos móveis.

A solução é composta por:
* 📱 **Aplicativo Móvel/Web** — O sistema deve disponibilizar um aplicativo móvel que permita visualizar a programação, acompanhar o histórico e receber notificações.
* ⚙️ **Backend e Nuvem** — O backend deve ser desenvolvido utilizando Node.js, Express e TypeScript.
* 🧩 **Dispositivo IoT (ESP32)** — O dispositivo deverá ser capaz de armazenar medicamentos em múltiplos compartimentos e liberar o acesso exclusivamente ao compartimento correspondente ao horário programado.

No momento adequado, o sistema deverá emitir um alerta sonoro, indicando ao usuário que o medicamento deve ser administrado. Caso a retirada não ocorra dentro do tempo esperado, o sistema deverá enviar uma notificação ao aplicativo móvel de um responsável previamente cadastrado.

<span id="sprints"></span>

## 📅 Sprints

| Links | Período | Status |
|:-----:|:----------:|:---------:|
| [Sprint 1](./docs/sprint-1.md) | 13/04/2026 a 30/04/2026 | Concluído ✅|
| [Sprint 2](./docs/sprint-2.md) | 04/05/2026 a 21/05/2026 | Concluído ✅|
| [Sprint 3](./docs/sprint-3.md) | 25/05/2026 a 11/06/2026 | Concluído ✅|

<span id="backlogArtefatos"></span>

## 🌲 Backlog do Produto

### Requisitos Funcionais
| ID | Descrição |
|:--:|-----------|
| RF01 | O sistema deve permitir o cadastro de medicamentos, contendo nome, dosagem, horários de administração e compartimento associado no dispositivo físico. |
| RF02 | O sistema deve permitir a definição de múltiplos horários para cada medicamento, incluindo frequência diária e intervalos específicos. |
| RF03 | O dispositivo físico deve possuir múltiplos compartimentos e permitir a abertura apenas do compartimento correspondente ao medicamento programado para o horário atual. |
| RF04 | O dispositivo deve emitir um alerta sonoro no momento em que o medicamento deve ser administrado. |
| RF05 | O sistema deve registrar quando o compartimento foi aberto, indicando que o medicamento foi retirado. |

### Requisitos Não Funcionais
| ID | Descrição |
|:--:|-----------|
| RNF01 | O sistema deve garantir integridade dos dados e funcionamento contínuo, mesmo diante de falhas temporárias de conexão (com mecanismos de retry ou armazenamento local). |
| RNF02 | O projeto deve implementar um pipeline de integração contínua que execute automaticamente build, testes e linting. |
| RNF03 | O sistema deve garantir autenticação de usuários, proteção de dados sensíveis e comunicação segura. |
| RNF04 | A solução deve utilizar containers (Docker) para padronização do ambiente de execução. |

<br>

<span id="visao"></span>

## 💻 Configuração do Ambiente e Execução

### Passo a Passo para Configurar o Ambiente de Desenvolvimento

**1. Clonar o Repositório**

```bash
git clone [https://github.com/octacodeteam/ABP4.git](https://github.com/octacodeteam/ABP4.git)
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
cd backend
npm install
npx prisma migrate dev
npm run dev
```

O servidor estará disponível na porta configurada (ex: `3001`).

**4. Instalar as Dependências do Frontend**

Abra um novo terminal, vá até a pasta do frontend e inicie o projeto:

```bash
cd frontend
npm install
npm run dev
```

**5. Configuração do Hardware (ESP32)**

O código do dispositivo IoT está na pasta `arduino`. Para utilizá-lo:

* Abra o arquivo `arduino/medcare_esp32_dispenser.ino` na Arduino IDE.
* Instale as bibliotecas necessárias para ESP32, JSON e comunicação MQTT.
* Ajuste as credenciais de rede Wi-Fi e os tópicos MQTT no código-fonte antes de realizar o upload para a placa.

<span id="metodologia"></span>

## 📚 Metodologia  

O projeto está sendo desenvolvido com a metodologia ágil, utilizando o framework Scrum.
* 📌 O trabalho é organizado em sprints curtas e incrementais.
* 👥 O time realiza alinhamentos constantes para garantir qualidade no código.
* 📝 As tarefas são organizadas no backlog e rastreadas no Trello.
* ✅ Há um fluxo completo de Integração e Entrega Contínua (CI/CD) com GitHub Actions.

## 📋 Trello

<p align="center">
  <a href="https://trello.com/invite/b/69dec988c2b18f1c1b578fc3/ATTId35279bcd69e3d52af53bdbf2b1052be5CD40C22/octacode-4-semestre" target="_blank">
    <img src="https://img.shields.io/badge/Trello-Octacode--Board-026AA7?style=for-the-badge&logo=trello&logoColor=white" alt="Trello Board"/>
  </a>
</p>

<span id="autores"></span>

## 👨‍💻 Autores

<div align="center">

| Nome | Função | GitHub |
| :--------------: | :-----------: | :----------------------------------------------------------: |
| **Alisson Franco Gritti** | Time de Dev | <a href="https://github.com/alissonfatec"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a> |
| **Breno de Luca** | Scrum Master | <a href="https://github.com/brn-lc"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a> |
| **Georgia Mantchev** | Product Owner | <a href="https://github.com/Mantchev13"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a> |
| **Gustavo Hammes** | Time de Dev | <a href="https://github.com/GustavoHammes"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a> |
| **Igor Santos Lima** | Time de Dev | <a href="https://github.com/IgorSantosL"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white"></a> |

</div>

<span id="tecnologias"></span>

## 🔌 Tecnologias

<h4 align="left">
  <img src="https://skillicons.dev/icons?i=react,tailwind,nodejs,express,ts,postgres,prisma,docker,arduino,git,github&perline=14" alt="Tecnologias Utilizadas">
</h4>

<br>

<p align="center">Developed by Octacode Team</p>
