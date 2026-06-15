require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/dialogflow', function(req, res) {
  var dialogflow = require('@google-cloud/dialogflow');
  var body       = req.body;
  var projectId  = process.env.DIALOGFLOW_PROJECT_ID;
  var sessionId  = body.sessionId || 'user-001';

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

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, function() {
  console.log('\n🔬 Lab-Safe in esecuzione su http://localhost:' + PORT + '\n');
});