require('dotenv').config();
const express  = require('express');
const path     = require('path');
const Database = require('better-sqlite3');

const app  = express();
const PORT = process.env.PORT || 3000;

// DATABASE
const db = new Database('labsafe.db');
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
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// DIALOGFLOW
app.post('/api/dialogflow', function(req, res) {
  var dialogflow = require('@google-cloud/dialogflow');
  var body      = req.body;
  var projectId = process.env.DIALOGFLOW_PROJECT_ID;
  var sessionId = body.sessionId || 'user-001';

  var client  = new dialogflow.SessionsClient();
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
      var attivita = params && params.tipo_esperimento
                     ? params.tipo_esperimento.stringValue
                     : body.attivita;
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

// HOMEPAGE
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, function() {
  console.log('\n🔬 Lab-Safe in esecuzione su http://localhost:' + PORT + '\n');
});