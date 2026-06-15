# 🔬 Lab-Safe
### Assistente Intelligente per la Sicurezza in Laboratorio

> Academy di Intelligenza Artificiale · A.A. 2025/2026  
> Gruppo 11 — Francesca Gaia Amato, Mario Dello Russo, Mattia Gerardo Bavaro

---

## Descrizione

Lab-Safe è un sistema in tempo reale per il monitoraggio e la verifica dei Dispositivi di Protezione Individuale (DPI) in un laboratorio chimico, basato su computer vision e machine learning.

Il sistema riconosce lo stato di sicurezza dell'operatore attraverso l'analisi visiva dei DPI indossati (area testa e corpo intero), traducendo i risultati in avvisi di sicurezza e attivando un chatbot conversazionale in grado di guidare l'utente in linguaggio naturale.

### Pipeline

```
Webcam / Immagine → OpenCV (estrazione ROI) → Teachable Machine (classificazione) → Lab-Safe UI → Dialogflow (chatbot)
```

---

## Funzionalità principali

- **Rilevamento DPI in tempo reale** tramite webcam o upload immagine
- **Estrazione Region of Interest** tramite Face Detection e Full Body Detection (OpenCV)
- **Classificazione** tramite due modelli Teachable Machine dedicati
- **Chatbot conversazionale** (Dialogflow) che guida l'operatore
- **Verifica conformità** DPI per attività specifiche di laboratorio
- **Interfaccia moderna** con tema light/dark e indicatori animati

### Modelli Teachable Machine

| Modello | Classi |
|---|---|
| Face | Occhiali, Mascherina, Entrambi, Nessuno |
| Full Body | Camice, Guanti, Entrambi, Nessuno |

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
- Account Google Cloud con Dialogflow API abilitata

---

## Installazione e avvio

```bash
# 1. Clonare il repository
git clone https://github.com/MarioDR/Academy_AIA.git
cd Academy_AIA/lab-safe

# 2. Installare le dipendenze
npm install

# 3. Configurare le variabili d'ambiente (vedi sezione Configurazione)

# 4. Avviare il server
npm start

# 5. Aprire nel browser
http://localhost:3000
```

---

## Configurazione

### 1. Credenziali Dialogflow

Creare un file `.env` nella cartella `lab-safe/`:

```
GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
DIALOGFLOW_PROJECT_ID=newagent-jgxd
```

Inserire il file `credentials.json` (service account Google Cloud) nella cartella `lab-safe/`.  
⚠️ **Necessario perchè non bisogna mai committare `credentials.json` e `.env` su GitHub.**

### 2. Struttura del progetto

```
lab-safe/
├── server.js              # Server Express + route API
├── public/
│   ├── index.html         # Interfaccia principale
│   ├── style.css          # Stile 
│   └── app.js             # Logica frontend
├── .env                   # Variabili d'ambiente (non committare)
├── credentials.json       # Credenziali Google (non committare)
├── .gitignore
└── README.md
```

---

## Integrazione Teachable Machine

Quando i modelli Teachable Machine saranno addestrati, il backend Python invierà i risultati al frontend tramite l'endpoint REST:

```
POST /api/dpi
Content-Type: application/json

{
  "occhiali":   true,
  "guanti":     false,
  "mascherina": true,
  "camice":     true,
  "confidenza": 87.4
}
```

Oppure chiamando direttamente le funzioni in `app.js`:

```js
// Aggiorna lo stato di ogni DPI (true = rilevato, false = non rilevato)
updateDPI('occhiali',   true,  true);
updateDPI('guanti',     false, true);
updateDPI('mascherina', true,  true);
updateDPI('camice',     true,  true);

// Aggiorna la barra di confidenza (0-100)
updateConfidence(87.4);

// Lancia la verifica conformità
checkCompliance();
```

> La funzione `simulateDPIDetection` in `app.js` è un placeholder per la demo — va rimossa o disabilitata quando Teachable Machine sarà integrato.

---

## Integrazione Dialogflow

Il server comunica con Dialogflow Essentials tramite il Google Cloud SDK.  
Gli intent configurati sono:

| Intent | Trigger | Descrizione |
|---|---|---|
| `Inizio_Attività` | Testo utente | L'operatore dichiara l'attività da svolgere |
| `DPI_Mancante_Fallback` | Evento `DPI_MANCANTE` | Segnala DPI mancanti e attende nuova acquisizione |
| `Conferma_DPI_Indossati` | Evento `DPI_CONFORMI` | Conferma la conformità e dà il via libera |

---

## Scenario demo

1. L'operatore dichiara l'attività nel chatbot: *"Voglio lavorare con i solventi"*
2. OpenCV estrae la Region of Interest dal frame webcam
3. Teachable Machine classifica i DPI rilevati sui due modelli (Face + Full Body)
4. Se un DPI manca: *"Attenzione: per l'attività selezionata è richiesta la mascherina. Indossarla prima di procedere."*
5. L'operatore indossa il DPI mancante
6. Il sistema rileva il cambio di stato: *"DPI verificati. Puoi procedere con l'esperimento."*

---

## Tecnologie utilizzate

| Layer | Tecnologia |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Chatbot | Google Dialogflow Essentials |
| Computer Vision | OpenCV (Python) |
| Classificazione | Google Teachable Machine (2 modelli) |

---

## Note per i collaboratori

- Non committare mai `credentials.json` o `.env`
- Per sviluppo con auto-reload: `npm install -g nodemon` poi `nodemon server.js`
- Il frontend comunica col backend tramite `POST /api/dialogflow` e `POST /api/dpi`
- La simulazione DPI (`simulateDPIDetection` in `app.js`) va rimossa quando Teachable Machine sarà integrato

---

*Academy di Intelligenza Artificiale · Gruppo 11 · 2025/2026*