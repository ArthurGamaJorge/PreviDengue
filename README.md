# 🦟 PreviDengue

### Uma Abordagem Multidisciplinar com Inteligência Artificial para o Monitoramento e Previsão da Dengue

---

[![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellowgreen)](https://github.com/seu-usuario/seu-repo)
[![Tecnologias](https://img.shields.io/badge/Python-3.x-blue)](https://www.python.org/)
[![Licença](https://img.shields.io/badge/Licen%C3%A7a-MIT-blue)](https://github.com/seu-usuario/seu-repo/blob/main/LICENSE)

---

## 💡 Sobre o Projeto

O **PreviDengue** é uma plataforma inovadora que integra inteligência artificial e dados geoespaciais e epidemiológicos para criar uma ferramenta poderosa no combate à dengue. O projeto, que nasceu da necessidade de soluções proativas de saúde pública, evoluiu para um sistema focado em dois pilares principais: a **detecção de focos do mosquito** e a **previsão de surtos epidemiológicos**.

Nossa missão é fornecer aos agentes públicos e à comunidade uma ferramenta acessível e precisa, unificando a análise de dados complexos em um **dashboard intuitivo** que permite o planejamento estratégico de ações preventivas e de combate.

---

## 🌍 Veja o PreviDengue em Ação

Você pode explorar a versão de demonstração do projeto e suas funcionalidades agora mesmo.

**Acesse a plataforma aqui: [https://previdengue.vercel.app/](https://previdengue.vercel.app/)**

---

## 🚀 Funcionalidades Principais

---

Nosso sistema é estruturado em dois módulos principais, ambos acessíveis através de uma interface unificada para uma análise composta dos dados.

### **Módulo de Detecção de Focos 🛰️**

Utilizamos Visão Computacional para analisar imagens aéreas de alta resolução e identificar potenciais criadouros do mosquito *Aedes aegypti*.

> **🧠 Como Funciona:** O algoritmo **YOLO (You Only Look Once)** escaneia as imagens para detectar objetos como piscinas e caixas d'água. Cada área recebe uma **pontuação de risco** baseada nos criadouros identificados, e os resultados são exibidos em um **mapa de calor** interativo para fácil visualização.

### **Módulo de Previsão de Surtos 📈**

Este módulo utiliza modelos de aprendizado de máquina para prever a tendência de casos de dengue, auxiliando na alocação de recursos e na preparação de campanhas de saúde.

> **🧠 Como Funciona:** Um modelo de **Rede Neural LSTM (Long Short-Term Memory)** é treinado com uma série histórica de dados do **DATASUS** e dados climáticos da **API da NASA**. A IA é capaz de capturar padrões complexos para prever picos de casos, permitindo que as autoridades tomem medidas preventivas antes que um surto se estabeleça.

---

## 🛠️ Tecnologias Utilizadas

---

Este projeto foi construído com uma stack de tecnologias modernas para garantir eficiência, escalabilidade e performance.

| Categoria | Tecnologia |
| :--- | :--- |
| **Linguagem** | ![Python](https://img.shields.io/badge/Python-3.x-blue?style=for-the-badge&logo=python&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) |
| **IA** | ![YOLO](https://img.shields.io/badge/YOLO-Ultralytics-orange?style=for-the-badge&logo=yolo&logoColor=white) ![LSTM](https://img.shields.io/badge/LSTM-Neural%20Network-red?style=for-the-badge&logo=tensorflow&logoColor=white) |
| **Backend** | ![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?style=for-the-badge&logo=fastapi) |
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white) |
| **Hospedagem** | ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white) ![Hugging Face](https://img.shields.io/badge/Hugging%20Face-FFBE00?style=for-the-badge&logo=hugging-face&logoColor=black) |

---

## 🏗️ Arquitetura do Sistema

---

O **PreviDengue** é composto por uma arquitetura em camadas que garante flexibilidade e desacoplamento entre os componentes.

### **Frontend**
A interface web, desenvolvida com **[Nome da Tecnologia]**, é a camada de apresentação que interage com o usuário. Ela se comunica com o backend para exibir o dashboard, o mapa de calor e permitir a submissão de imagens.

### **Backend**
Construído com **FastAPI**, o backend atua como um hub central. Ele recebe as requisições do frontend, gerencia o fluxo de dados e se comunica com as APIs dos modelos de IA para obter os resultados de detecção e previsão.

### **Módulos de IA**
Os modelos **YOLO** (para detecção) e **LSTM** (para previsão) são treinados em ambiente de nuvem (**Google Colab**) e expostos como **APIs RESTful** separadas, utilizando a plataforma **Hugging Face**. Essa abordagem garante que o processamento pesado seja feito na nuvem, otimizando o desempenho do sistema.

---

## 🧭 Como Usar

---

O projeto ainda está em desenvolvimento, mas o código-fonte estará disponível em breve. Para rodar a aplicação localmente:

1.  Clone este repositório:
    ```bash
    git clone [https://github.com/seu-usuario/seu-repo.git](https://github.com/seu-usuario/seu-repo.git)
    cd seu-repo
    ```
2.  Instale as dependências. Siga as instruções específicas nas pastas `backend` e `frontend`.
    ```bash
    # Para o backend
    pip install -r requirements.txt
    # Para o frontend
    npm install
    ```
3.  Inicie o servidor de desenvolvimento.
    ```bash
    # Primeiro, inicie o backend
    python main.py
    # Em um novo terminal, inicie o frontend
    npm run dev
    ```

> **Nota:** Certifique-se de configurar as variáveis de ambiente necessárias para acessar as APIs de IA.

---

## 🧑‍🤝‍🧑 Equipe

---

O **PreviDengue** é um projeto de Trabalho de Conclusão de Curso do Colégio Técnico de Campinas (COTUCA - UNICAMP), desenvolvido por:

* **Arthur Gama Jorge** – [cc23578@g.unicamp.br](mailto:cc23578@g.unicamp.br)
* **Daniel Dorigan de Carvalho Campos** – [cc23124@g.unicamp.br](mailto:cc23124@g.unicamp.br)
* **Ion Mateus Nunes Oprea** – [cc23135@g.unicamp.br](mailto:cc23135@g.unicamp.br)

**Orientadora:** Andréia
**Coorientador:** Guilherme

---

## 📜 Licença

---

Este projeto está licenciado sob a Licença **[Nome da Licença, ex: MIT]** - veja o arquivo [LICENSE.md](https://github.com/seu-usuario/seu-repo/blob/main/LICENSE) para mais detalhes.
