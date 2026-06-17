// CONFIGURAZIONE DOTENV: punta al file nella cartella config
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../config/env.txt') });

const express  = require('express');
const Database = require('better-sqlite3');

const app  = express();
const PORT = process.env.PORT || 3000;

// DATABASE: punta alla cartella lab-safe/database/labsafe.db
const dbPath = path.join(__dirname, '../../../database/labsafe.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessioni (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    operatore     TEXT DEFAULT 'Operatore',
    attivita      TEXT,
    dpi_mancanti  TEXT,
    dpi_verificati TEXT,
    esito         TEXT,
    inizio        TEXT,
    fine          TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS attivita_dpi (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    attivita TEXT UNIQUE,
    dpi      TEXT,
    rischio  TEXT
  )
`);

var count = db.prepare('SELECT COUNT(*) as n FROM attivita_dpi').get();
if (count.n === 0) {
  var insert = db.prepare('INSERT INTO attivita_dpi (attivita, dpi, rischio) VALUES (?, ?, ?)');
  insert.run('miscelazione_acidi', JSON.stringify(['occhiali','guanti','camice','mascherina']), 'Alto');
  insert.run('uso_fiamme',         JSON.stringify(['occhiali','guanti','camice']),              'Alto');
  insert.run('uso_solventi',       JSON.stringify(['occhiali','guanti','mascherina']),          'Medio');
  insert.run('titolazione',        JSON.stringify(['occhiali','guanti']),                       'Medio');
  insert.run('osservazione_microscopia', JSON.stringify(['occhiali']), 'Basso');
  insert.run('manipolazione_campioni',   JSON.stringify(['occhiali', 'mascherina']), 'Basso');
}

app.use(express.json({ limit: '50mb' }));

// ELABORAZIONE FRAME (Proxy verso Python Microservice)
app.post('/api/process-frame', async function(req, res) {
  try {
    const pythonRes = await fetch('http://127.0.0.1:5000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await pythonRes.json();
    res.json(data);
  } catch (err) {
    console.error('Errore comunicazione con server Python:', err.message);
    res.status(500).json({ status: 'error', message: 'Server Python non raggiungibile. Assicurati che detector.py sia in esecuzione in modalità server.' });
  }
});

// FILE STATICI: punta alla cartella lab-safe/src/frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

app.use('/models', express.static(path.join(__dirname, '../../../data/models/teachable_machine')));

// DIALOGFLOW
app.post('/api/dialogflow', function(req, res) {
  var dialogflow = require('@google-cloud/dialogflow');
  var body      = req.body;
  var projectId = process.env.DIALOGFLOW_PROJECT_ID;
  var sessionId = body.sessionId || 'user-001';

  // Configura esplicitamente le credenziali di Google se presenti
  var config = {};
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    config.keyFilename = path.join(__dirname, '../../../config/credentials.json');
  }

  var client  = new dialogflow.SessionsClient(config);
  var session = client.projectAgentSessionPath(projectId, sessionId);

  var request = {
    session: session,
    queryInput: {
      text: {
        text:         body.message || '',
        languageCode: 'it',
      },
    },
  };

  client.detectIntent(request)
    .then(function(responses) {
      var result   = responses[0].queryResult;
      var params   = result.parameters && result.parameters.fields;
      var attivita = body.attivita;
      if (params && params.tipo_esperimento) {
        var tp = params.tipo_esperimento;
        if (tp.listValue && tp.listValue.values && tp.listValue.values.length > 0) {
          attivita = tp.listValue.values[0].stringValue;
        } else if (tp.stringValue) {
          attivita = tp.stringValue;
        }
      }
      res.json({
        reply:    result.fulfillmentText,
        intent:   result.intent ? result.intent.displayName : null,
        attivita: attivita || null,
      });
    })
    .catch(function(err) {
      console.error('Dialogflow error:', err.message);
      res.status(500).json({ reply: 'Errore Dialogflow. Riprova.', intent: null, attivita: null });
    });
});

// DPI (da Teachable Machine)
app.post('/api/dpi', function(req, res) {
  var body       = req.body;
  var occhiali   = body.occhiali   || false;
  var guanti     = body.guanti     || false;
  var mascherina = body.mascherina || false;
  var camice     = body.camice     || false;
  var confidenza = body.confidenza || 0;

  console.log('DPI ricevuti da Teachable Machine:', body);

  res.json({
    status:   'ok',
    received: { occhiali, guanti, mascherina, camice, confidenza }
  });
});

// SESSIONI
app.post('/api/sessioni', function(req, res) {
  var b    = req.body;
  var stmt = db.prepare(
    'INSERT INTO sessioni (operatore, attivita, dpi_mancanti, dpi_verificati, esito, inizio, fine) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(
    b.operatore || 'Operatore',
    b.attivita  || '',
    JSON.stringify(b.dpi_mancanti   || []),
    JSON.stringify(b.dpi_verificati || []),
    b.esito  || '',
    b.inizio || new Date().toISOString(),
    b.fine   || new Date().toISOString()
  );
  res.json({ status: 'ok' });
});

app.get('/api/sessioni', function(req, res) {
  var rows = db.prepare('SELECT * FROM sessioni ORDER BY id DESC LIMIT 50').all();
  res.json(rows);
});

app.get('/api/attivita', function(req, res) {
  var rows = db.prepare('SELECT * FROM attivita_dpi').all();
  res.json(rows);
});

app.get('/api/statistiche', function(req, res) {
  var totali      = db.prepare('SELECT COUNT(*) as n FROM sessioni').get();
  var conformi    = db.prepare("SELECT COUNT(*) as n FROM sessioni WHERE esito = 'conforme'").get();
  var perAttivita = db.prepare('SELECT attivita, COUNT(*) as n FROM sessioni GROUP BY attivita ORDER BY n DESC').all();
  var ultimi7     = db.prepare("SELECT DATE(inizio) as giorno, COUNT(*) as n FROM sessioni WHERE inizio >= DATE('now', '-7 days') GROUP BY DATE(inizio) ORDER BY giorno ASC").all();
  var dpiRows     = db.prepare("SELECT dpi_mancanti FROM sessioni WHERE esito = 'non conforme'").all();

  var contaDPI = {};
  dpiRows.forEach(function(row) {
    JSON.parse(row.dpi_mancanti || '[]').forEach(function(dpi) {
      contaDPI[dpi] = (contaDPI[dpi] || 0) + 1;
    });
  });

  res.json({
    totale:       totali.n,
    conformi:     conformi.n,
    violazioni:   totali.n - conformi.n,
    per_attivita: perAttivita,
    ultimi7:      ultimi7,
    dpi_mancanti: contaDPI
  });
});

// HOMEPAGE: punta a lab-safe/src/frontend/index.html
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

const { spawn } = require('child_process');
const pythonProcess = spawn('python', [path.join(__dirname, '../vision/detector.py'), '--mode', 'server']);

pythonProcess.stdout.on('data', (data) => console.log(`[YOLOv8]: ${data.toString().trim()}`));
pythonProcess.stderr.on('data', (data) => console.error(`[YOLOv8 Error]: ${data.toString().trim()}`));
pythonProcess.on('close', (code) => console.log(`[YOLOv8] Server terminato con codice ${code}`));

process.on('exit', () => pythonProcess.kill());
process.on('SIGINT', () => { pythonProcess.kill(); process.exit(); });
process.on('SIGTERM', () => { pythonProcess.kill(); process.exit(); });

app.listen(PORT, function() {
  console.log('\n🔬 Lab-Safe in esecuzione su http://localhost:' + PORT + '\n');
});