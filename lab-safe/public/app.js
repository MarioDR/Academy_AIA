var DPI_RICHIESTI = {
  miscelazione_acidi: ['occhiali', 'guanti', 'camice', 'mascherina'],
  uso_fiamme:         ['occhiali', 'guanti', 'camice'],
  uso_solventi:       ['occhiali', 'guanti', 'mascherina'],
  titolazione:        ['occhiali', 'guanti'],
};

var RISCHIO_LABEL = {
  miscelazione_acidi: 'Alto · miscelazione acidi',
  uso_fiamme:         'Alto · uso fiamme libere',
  uso_solventi:       'Medio · uso solventi',
  titolazione:        'Medio · titolazione',
};

var ATTIVITA_ALIAS = {
  'miscelazione acidi': 'miscelazione_acidi',
  'acidi':              'miscelazione_acidi',
  'fiamme':             'uso_fiamme',
  'fiamma':             'uso_fiamme',
  'bunsen':             'uso_fiamme',
  'solventi':           'uso_solventi',
  'solvente':           'uso_solventi',
  'titolazione':        'titolazione',
  'titolo':             'titolazione',
};

var currentTheme    = 'light';
var streamActive    = false;
var currentActivity = null;
var dpiState        = { occhiali: null, guanti: null, mascherina: null, camice: null };

function updateClock() {
  var now = new Date();
  var d = now.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  var t = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('topbarTime').textContent = d + ' · ' + t;
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.className = currentTheme;
  document.getElementById('toggleIcon').className = currentTheme === 'dark' ? 'ti ti-sun' : 'ti ti-moon';
  document.getElementById('toggleLabel').textContent = currentTheme === 'dark' ? 'Light' : 'Dark';
}

function switchTab(tab) {
  if (tab === 'webcam') {
    document.getElementById('webcamArea').style.display = '';
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('tabWebcam').classList.add('active');
    document.getElementById('tabUpload').classList.remove('active');
    document.getElementById('streamBadge').textContent = 'Webcam live';
  } else {
    document.getElementById('uploadArea').style.display = '';
    document.getElementById('webcamArea').style.display = 'none';
    document.getElementById('tabUpload').classList.add('active');
    document.getElementById('tabWebcam').classList.remove('active');
    document.getElementById('streamBadge').textContent = 'Upload';
    stopWebcam();
  }
}

function startWebcam() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(function(stream) {
      var video = document.getElementById('videoFeed');
      video.srcObject = stream;
      video.style.display = 'block';
      document.getElementById('webcamPlaceholder').style.display = 'none';
      streamActive = true;
      document.getElementById('streamBar').style.width = '90%';
      document.getElementById('streamVal').textContent = 'attivo';
      addMessage('bot', 'Stream avviato. Quale attività vuoi svolgere?');
    })
    .catch(function() {
      addMessage('bot', 'Impossibile accedere alla webcam. Controlla i permessi del browser.');
    });
}

function stopWebcam() {
  var video = document.getElementById('videoFeed');
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(function(t) { t.stop(); });
    video.srcObject = null;
  }
  video.style.display = 'none';
  document.getElementById('webcamPlaceholder').style.display = 'flex';
  streamActive = false;
  document.getElementById('streamBar').style.width = '0%';
  document.getElementById('streamVal').textContent = 'inattivo';
}

function handleUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  var preview = document.getElementById('uploadPreview');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
  addMessage('bot', 'Immagine caricata: ' + file.name + '. Analisi in corso…');
}

function updateDPI(dpiKey, present, skipCheck) {
  dpiState[dpiKey] = present;
  var item = document.getElementById('dpi-' + dpiKey);
  if (!item) return;
  item.className = 'dpi-item ' + (present ? 'ok' : 'warn');
  item.querySelector('.pulse-wrap').className = 'pulse-wrap ' + (present ? 'pw-ok' : 'pw-warn');
  item.querySelector('.dpi-status').textContent = present ? 'OK' : '!';
  if (!skipCheck) checkCompliance();
}

function checkCompliance() {
  if (!currentActivity) return;
  var richiesti = DPI_RICHIESTI[currentActivity] || [];
  var mancanti  = richiesti.filter(function(d) { return dpiState[d] === false; });
  var badge     = document.getElementById('dpiBadge');
  if (mancanti.length === 0) {
    badge.textContent = 'Tutti OK';
    badge.className   = 'panel-badge ok';
    addMessage('success', '✓ DPI verificati. Puoi procedere in sicurezza.');
  } else {
    badge.textContent = mancanti.length + (mancanti.length > 1 ? ' mancanti' : ' mancante');
    badge.className   = 'panel-badge warn';
    var lista = mancanti.map(function(d) { return d.charAt(0).toUpperCase() + d.slice(1); }).join(', ');
    addMessage('alert', 'Attenzione: mancano ' + lista + '. Indossali prima di procedere.');
  }
}

function setDPIIdle() {
  ['occhiali','guanti','mascherina','camice'].forEach(function(k) {
    dpiState[k] = null;
    var item = document.getElementById('dpi-' + k);
    if (!item) return;
    item.className = 'dpi-item idle';
    item.querySelector('.pulse-wrap').className = 'pulse-wrap pw-idle';
    item.querySelector('.dpi-status').textContent = '—';
  });
  document.getElementById('dpiBadge').textContent = 'in attesa';
  document.getElementById('dpiBadge').className   = 'panel-badge';
}

function updateConfidence(value) {
  document.getElementById('confBar').style.width = Math.round(value) + '%';
  document.getElementById('confVal').textContent  = Math.round(value) + '%';
}

function updateRisk(activityKey) {
  var val  = document.getElementById('riskVal');
  var icon = document.getElementById('riskStrip').querySelector('.risk-icon');
  if (!activityKey) {
    val.textContent = 'Nessuna attività selezionata';
    icon.className  = 'ti ti-flask risk-icon';
    return;
  }
  val.textContent = RISCHIO_LABEL[activityKey] || activityKey;
  icon.className  = (activityKey === 'miscelazione_acidi' || activityKey === 'uso_fiamme')
    ? 'ti ti-alert-triangle risk-icon'
    : 'ti ti-alert-circle risk-icon';
}

function addMessage(type, text) {
  var container = document.getElementById('chatMessages');
  var div    = document.createElement('div');
  div.className = 'msg ' + type;
  var sender = document.createElement('div');
  sender.className = 'msg-sender';
  sender.textContent = type === 'user' ? 'Operatore' : type === 'alert' ? 'Alert' : 'Lab-Safe';
  div.appendChild(sender);
  div.appendChild(document.createTextNode(text));
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  var input = document.getElementById('chatInput');
  var text  = input.value.trim();
  if (!text) return;
  input.value = '';
  addMessage('user', text);
  processUserMessage(text.toLowerCase());
}

function processUserMessage(text) {
  var dpiRilevati = Object.keys(dpiState).filter(function(k) { return dpiState[k] === true; });
  fetch('/api/dialogflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message:     text,
      sessionId:   'user-001',
      dpiRilevati: dpiRilevati,
      attivita:    currentActivity,
    }),
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.attivita && data.attivita !== currentActivity) {
      currentActivity = data.attivita;
      updateRisk(currentActivity);
      setDPIIdle();
      if (streamActive || document.getElementById('uploadPreview').style.display !== 'none') {
        setTimeout(function() { simulateDPIDetection(currentActivity); }, 1200);
      } else {
        addMessage('bot', 'Avvia la webcam o carica un\'immagine per analizzare i DPI.');
      }   
    }
    if (data.reply) addMessage('bot', data.reply);
  })
  .catch(function() {
    addMessage('bot', 'Errore di connessione al server. Riprova.');
  });
}

function simulateDPIDetection(activityKey) {
  var richiesti = DPI_RICHIESTI[activityKey] || [];
  var tutti     = ['occhiali', 'guanti', 'mascherina', 'camice'];
  var mancante  = richiesti[Math.floor(Math.random() * richiesti.length)];

  tutti.forEach(function(d) {
    updateDPI(d, richiesti.indexOf(d) !== -1 ? d !== mancante : false, true);
  });
  checkCompliance();
  updateConfidence(65 + Math.random() * 20);

  setTimeout(function() {
    tutti.forEach(function(d) { updateDPI(d, richiesti.indexOf(d) !== -1, true); });
    checkCompliance();
    updateConfidence(88 + Math.random() * 10);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
  updateClock();
  setInterval(updateClock, 10000);

  document.getElementById('toggleBtn').addEventListener('click', toggleTheme);
  document.getElementById('tabWebcam').addEventListener('click', function() { switchTab('webcam'); });
  document.getElementById('tabUpload').addEventListener('click', function() { switchTab('upload'); });
  document.getElementById('startBtn').addEventListener('click', startWebcam);
  document.getElementById('sendBtn').addEventListener('click', sendMessage);
  document.getElementById('chooseFileBtn').addEventListener('click', function() {
    document.getElementById('fileInput').click();
  });
  document.getElementById('fileInput').addEventListener('change', handleUpload);
  document.getElementById('chatInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendMessage();
  });
});
