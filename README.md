# 🔬 Lab-Safe
### Assistente Intelligente per la Sicurezza in Laboratorio

> Academy di Intelligenza Artificiale · A.A. 2025/2026  
> Gruppo 11 — Francesca Gaia Amato, Mario Dello Russo, Mattia Gerardo Bavaro

---

## Descrizione

Lab-Safe è un sistema in tempo reale per il monitoraggio e la verifica dei Dispositivi di Protezione Individuale (DPI) in un laboratorio chimico, basato su computer vision e machine learning.

Il sistema riconosce lo stato di sicurezza dell'operatore attraverso l'analisi visiva dei DPI indossati, traducendo i risultati in avvisi di sicurezza e attivando un chatbot conversazionale in grado di guidare l'utente in linguaggio naturale.

### Pipeline

```
Webcam / Immagine → OpenCV (estrazione ROI) → Teachable Machine (classificazione) → Lab-Safe UI → Dialogflow (chatbot)
```

---

## Funzionalità principali

- **Rilevamento DPI** tramite webcam live o upload immagine
- **Estrazione Region of Interest** tramite YOLOv8 Pose con OpenCV
- **Classificazione DPI** tramite modello Teachable Machine (Face)
- **Chatbot conversazionale** (Dialogflow) che guida l'operatore
- **Verifica conformità** DPI per attività specifiche di laboratorio
- **Storico sessioni** con statistiche e grafici
- **Interfaccia user-friendly** con tema light/dark, input vocale e TTS

### Modelli Teachable Machine

| Modello | Classi | Stato |
|---|---|---|
| Face | Occhiali, Mascherina, Entrambi, Nessuno | 🟢 In sviluppo |
| Full Body | Camice, Guanti, Entrambi, Nessuno | 🔴 Release futura |

### Attività supportate

| Attività | DPI richiesti | Rischio |
|---|---|---|
| Miscelazione acidi | Occhiali, Guanti, Camice, Mascherina | Alto |
| Uso fiamme libere | Occhiali, Guanti, Camice | Alto |
| Uso solventi | Occhiali, Guanti, Mascherina | Medio |
| Titolazione | Occhiali, Guanti | Medio |

---

## Requisiti

- [Node.js](https://nodejs.org/) v18+
- npm v9+
- Python 3.9+ con pip
- Account Google Cloud con Dialogflow API abilitata

---

## Installazione e avvio

```bash
# 1. Clonare il repository
git clone https://github.com/MarioDR/Academy_AIA.git
cd Academy_AIA/lab-safe

# 2. Installare le dipendenze Node
npm install

# 3. Installare le dipendenze Python
pip install -r requirements.txt

# 4. Configurare le variabili d'ambiente (vedi sezione Configurazione)

# 5. Avviare il server
npm start

# 6. Aprire nel browser
http://localhost:3000
```

---

## Configurazione

### 1. Credenziali Dialogflow

Creare un file `env.txt` nella cartella `lab-safe/config/`:

```
DIALOGFLOW_PROJECT_ID=newagent-jgxd
GOOGLE_APPLICATION_CREDENTIALS=./config/credentials.json
PORT=3000
```

Inserire il file `credentials.json` (service account Google Cloud) nella cartella `lab-safe/config/`.  

### 2. Struttura del progetto

```
lab-safe/
├── config/
│   ├── credentials.json       # Credenziali Google Cloud 
│   └── env.txt                # Variabili d'ambiente 
├── data/
│   ├── models/
│   │   └── yolov8n-pose.pt    # Modello YOLOv8 Pose
│   └── raw/
│       ├── Face/              # Dataset grezzo volti (per TM)
│       └── Full-Body/         # Dataset grezzo corpo (per TM)
├── database/
│   └── labsafe.db             # Database SQLite 
├── docs/
│   └── AIA_G11_PropostaProgettuale.pdf
├── src/
│   ├── backend/
│   │   ├── app/
│   │   │   └── server.js      # Server Express + API REST
│   │   └── vision/
│   │       └── detector.py    # Estrazione ROI con OpenCV + YOLOv8
│   └── frontend/
│       ├── index.html         # Interfaccia principale
│       ├── style.css          # Stile
│       └── app.js             # Logica frontend
├── package.json
├── requirements.txt
├── .gitignore
└── README.md
```

---

### Utilizzo di detector.py

`detector.py` usa YOLOv8 Pose per estrarre ROI facciali e corporee da immagini o webcam. È utile principalmente per **costruire il dataset** da fornire a Teachable Machine.

```bash
# Elabora una cartella di immagini ed esporta le ROI nel dataset
python src/backend/vision/detector.py --mode folder --source /percorso/cartella

# Testa su una singola immagine
python src/backend/vision/detector.py --mode image --source /percorso/immagine.jpg

# Testa in tempo reale con webcam
python src/backend/vision/detector.py --mode webcam
```

---

## Integrazione Dialogflow

Il server comunica con Dialogflow Essentials tramite il Google Cloud SDK.  
Gli intent configurati sono:

| Intent | Descrizione |
|---|---|
| `Inizio_Attività` | L'operatore dichiara l'attività da svolgere |
| `DPI_Mancante_Fallback` | Segnala DPI mancanti e attende nuova acquisizione |
| `Conferma_DPI_Indossati` | Conferma la conformità e dà il via libera |

---

## Scenario demo

1. L'operatore inserisce il proprio nome e accede all'interfaccia
2. Dichiara l'attività nel chatbot: *"Voglio lavorare con i solventi"*
3. Avvia la webcam o carica un'immagine
4. OpenCV + YOLOv8 estrae la ROI facciale
5. Teachable Machine classifica i DPI rilevati
6. Se un DPI manca: *"Attenzione: per l'attività selezionata è richiesta la mascherina. Indossarla prima di procedere."*
7. L'operatore indossa il DPI mancante
8. Il sistema rileva il cambio di stato: *"DPI verificati. Puoi procedere con l'esperimento."*
9. La sessione viene salvata nel database e visibile nello storico

---

## Roadmap

| Funzionalità | Stato |
|---|---|
| UI completa (light/dark, storico, statistiche) | 🟢 Completato |
| Backend Express + SQLite | 🟢 Completato |
| Integrazione Dialogflow | 🟢 Completato |
| Estrazione ROI con YOLOv8 Pose | 🟢 Completato |
| Modello Teachable Machine — Face | 🟠 In sviluppo |
| Integrazione TM → frontend | 🟠 In attesa del modello |
| Modello Teachable Machine — Full Body | 🔴 Release futura |
| Ottimizzazione luce variabile | 🔴 Release futura |
| Flussi conversazionali aggiuntivi | 🔴 Release futura |

---

## Tecnologie utilizzate

| Layer | Tecnologia |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express, SQLite (better-sqlite3) |
| Chatbot | Google Dialogflow Essentials |
| Computer Vision | OpenCV + YOLOv8 Pose (Python) |
| Classificazione | Google Teachable Machine |

---

## Note per sviluppi futuri

- Il modello Full Body (camice e guanti) è già supportato dall'architettura — basterà alimentare `updateDPI('camice', ...)` e `updateDPI('guanti', ...)` con il secondo modello TM

---

*Academy di Intelligenza Artificiale · Gruppo 11 · 2025/2026*