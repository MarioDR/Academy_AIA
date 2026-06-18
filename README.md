# Lab-Safe: AI-Powered Laboratory Safety Assistant

## 📖 Context
**Lab-Safe** was developed as a thesis project following an Academic Internship at the **AI Applications Academy**, hosted at the **Università degli Studi di Salerno (UNISA)**, during the academic year **2025/26**. The goal of the project is to enhance safety in chemical and biological laboratories through real-time computer vision and conversational AI.

## 🚀 Features
- **Real-Time PPE Detection:** Automatically verifies if the operator is wearing the required Personal Protective Equipment (PPE) such as safety glasses, masks, gloves, and lab coats.
- **Conversational Assistant:** Integrated with Google Dialogflow to provide a natural language interface. Users can simply state the experiment they are about to perform, and the system will automatically configure the required PPE checklist.
- **Dual Input Modes:** Supports live webcam streams and static image uploads (including HEIC formats from mobile devices).
- **Compliance Dashboard:** Visualizes real-time status, confidence scores, and historical session data (SVG-based charts) directly in the browser.
- **Session Logging:** Securely stores compliance outcomes in a local SQLite database for auditing and statistics.

## 🏗 Architecture
The system is built on a modular, multi-tier architecture to ensure high performance and maintainability:

1. **Frontend (Client-side):** 
   A Single Page Application (SPA) built with Vanilla HTML, CSS, and JavaScript. It handles UI/UX, media capture, SVG charting, and runs the final PPE classification loop using **TensorFlow.js (Teachable Machine)** models directly in the browser.
2. **Backend (Node.js):** 
   An **Express.js** server acting as an API gateway. It manages local sessions via **better-sqlite3**, handles external communication with the **Google Dialogflow** API for intent recognition, and proxies image frames to the Python microservice.
3. **Vision Microservice (Python):** 
   A dedicated REST API server utilizing **OpenCV** and **Ultralytics YOLOv8 (Pose)**. It receives base64-encoded frames, detects the operator's body and facial keypoints, and accurately crops the Regions of Interest (ROI) before sending them back to the frontend for final Teachable Machine classification.

## 🛠 Technologies & Dependencies

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=nodedotjs&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-Semantic-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-Responsive-1572B6?logo=css3&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite&logoColor=white)
![OpenCV](https://img.shields.io/badge/OpenCV-Computer%20Vision-5C3EE8?logo=opencv&logoColor=white)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-Machine%20Learning-FF6F00?logo=tensorflow&logoColor=white)
![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-00FFFF?logo=yolo&logoColor=black)
![Google Dialogflow](https://img.shields.io/badge/Dialogflow-NLP-FF9800?logo=dialogflow&logoColor=white)

The **Lab-Safe** platform is implemented using modern technologies, with a clear separation between frontend, backend API gateway, and vision microservice.

### Backend
- **Node.js & Express.js** – Server-side logic and API proxying
- **better-sqlite3** – Lightweight local database for session management

### Frontend
- **HTML5 & CSS3** – Semantic structure and responsive styling
- **JavaScript (Vanilla JS)** – Client-side logic, UI interactions, and SVG charting
- **TensorFlow.js** – Browser-side ML inference (Teachable Machine)

### Vision Microservice
- **Python** – Computer vision logic
- **OpenCV & Ultralytics YOLOv8** – Frame processing, pose estimation, and ROI extraction

### External APIs
- **Google Dialogflow** – NLP capabilities for the conversational assistant

## 📂 Project Skeleton

```text
Academy_AIA/
├── config/
│   ├── env.txt                 # Environment variables configuration
│   └── credentials.json        # Google Dialogflow service account keys
├── data/
│   ├── models/                 # YOLOv8 and Teachable Machine weights
│   └── raw/                    # Raw datasets for model training
├── database/
│   └── labsafe.db              # SQLite database file
├── lab-safe/                   # Main application directory
│   ├── src/
│   │   ├── backend/
│   │   │   ├── app/            # Node.js Express server
│   │   │   └── vision/         # Python vision microservice (detector.py)
│   │   └── frontend/           # Client-side files (HTML, CSS, JS, assets)
│   ├── package.json            # Node.js dependencies
│   └── requirements.txt        # Python dependencies
└── README.md                   # Project documentation
```

## 🌍 Linguistic Conventions Note
Please note that while this README and the general project documentation are written in **English** for international accessibility, the entire **codebase** (including variable names, functions, and inline comments) as well as the **User Interface (UI)** are written in **Italian**.

## 🛠 How to Download, Setup, and Run

### 1. Prerequisites
Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (3.9 or higher)
- Git

### 2. Download and Installation
Clone the repository and navigate to the project directory:
```bash
git clone https://github.com/your-username/Academy_AIA.git
cd "Academy_AIA/lab-safe"
```

**Install Node.js dependencies:**
```bash
npm install
```

**Setup Python environment:**
It is highly recommended to use a virtual environment.
```bash
# Create and activate virtual environment (Windows)
python -m venv aia_env
.\aia_env\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Configuration
1. Obtain your Google Cloud Service Account credentials (`credentials.json`) for Dialogflow.
2. Place the `credentials.json` file inside the `config/` directory.
3. Create an `env.txt` (or `.env`) file in the `config/` directory with the following variables:
```env
PORT=3000
DIALOGFLOW_PROJECT_ID=your-dialogflow-project-id
GOOGLE_APPLICATION_CREDENTIALS=./config/credentials.json
```

### 4. Running the Application
The Node.js backend is configured to automatically spawn the Python Vision Microservice in the background. Simply run:

```bash
npm start
```
The application will be accessible at: `http://localhost:3000`

---

## 🐺 Team Members
- [**Amato Francesca Gaia**](https://github.com/famato46)
- [**Bavaro Mattia Gerardo**](https://github.com/mattiajb)
- [**Dello Russo Mario**](https://github.com/MarioDR)

**Institution:** Università degli Studi di Salerno (UNISA)
**Program:** Academic Internship (Tirocinio Accademico) at AI Applications Academy
