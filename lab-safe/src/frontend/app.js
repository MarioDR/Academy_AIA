var DPI_RICHIESTI = {
  miscelazione_acidi: ['occhiali', 'guanti', 'camice', 'mascherina'],
  uso_fiamme:         ['occhiali', 'guanti', 'camice'],
  uso_solventi:       ['occhiali', 'guanti', 'mascherina'],
  titolazione:        ['occhiali', 'guanti'],
  osservazione_microscopia: ['occhiali'],
  manipolazione_campioni:   ['occhiali', 'mascherina'],
};

var RISCHIO_LABEL = {
  miscelazione_acidi: 'Alto · miscelazione acidi',
  uso_fiamme:         'Alto · uso fiamme libere',
  uso_solventi:       'Medio · uso solventi',
  titolazione:        'Medio · titolazione',
  osservazione_microscopia: 'Basso · osservazione microscopia',
  manipolazione_campioni:   'Basso · manipolazione campioni',
};

var ATTIVITA_ALIAS = {
  'miscelazione acidi':  'miscelazione_acidi',
  'acidi':               'miscelazione_acidi',
  'fiamme':              'uso_fiamme',
  'fiamma':              'uso_fiamme',
  'bunsen':              'uso_fiamme',
  'solventi':            'uso_solventi',
  'solvente':            'uso_solventi',
  'titolazione':         'titolazione',
  'titolo':              'titolazione',
  'microscopia':         'osservazione_microscopia',
  'microscopio':         'osservazione_microscopia',
  'campioni':            'manipolazione_campioni',
  'manipolazione':       'manipolazione_campioni',
  
};

var tmModel = null;
var tmModelURL = '/models/face/';
var sessioneSalvata = false;
var speechOutputEnabled = false;
var operatoreCorrente = 'Operatore';
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
      avviaLoopTM();
      document.getElementById('streamBar').style.width = '90%';
      document.getElementById('streamVal').textContent = 'attivo';
      if (currentActivity) {
        setTimeout(function() { classificaConTM(); }, 1200);
      } else {
      addMessage('bot', 'Stream avviato. Quale attività vuoi svolgere?');
    }
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
  fermaLoopTM();
  document.getElementById('streamBar').style.width = '0%';
  document.getElementById('streamVal').textContent = 'inattivo';
}

function handleUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  var preview = document.getElementById('uploadPreview');
  
  preview.onload = function() {
    if (!currentActivity) {
      addMessage('bot', 'Immagine caricata. Dimmi prima quale attività vuoi svolgere.');
      return;
    }
    sessioneSalvata = false; // reset per nuova immagine
    setDPIIdle();            // reset stato DPI
    addMessage('bot', 'Immagine caricata. Avvio analisi DPI…');
    classificaConTM();
  };

  preview.onerror = function() {
    addMessage('bot', 'Errore: Formato immagine non supportato dal browser. Prova con un JPG o PNG.');
  };

  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
  event.target.value = ''; // reset per permettere di ricaricare la stessa immagine
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
    if (!sessioneSalvata) {
      addMessage('success', '✓ DPI verificati. Puoi procedere in sicurezza.');
      salvaSessione('conforme');
      sessioneSalvata = true;
    }
  } else {
    badge.textContent = mancanti.length + (mancanti.length > 1 ? ' mancanti' : ' mancante');
    badge.className   = 'panel-badge warn';
    if (!sessioneSalvata) {
      var lista = mancanti.map(function(d) { return d.charAt(0).toUpperCase() + d.slice(1); }).join(', ');
      addMessage('alert', 'Attenzione: mancano ' + lista + '. Indossali prima di procedere.');
      salvaSessione('non conforme');
      sessioneSalvata = true;
    }
  }
}

function setDPIIdle() {
   sessioneSalvata = false;
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

function showAnalyzing(show) {
  var area = document.getElementById('webcamPlaceholder');
  var existing = document.getElementById('analyzingIndicator');
  if (show) {
    if (existing) return;
    var ind = document.createElement('div');
    ind.id = 'analyzingIndicator';
    ind.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:10px;';
    ind.innerHTML = '<div style="display:flex;gap:6px;align-items:center;">' +
      '<span class="analyzing-dot"></span>' +
      '<span class="analyzing-dot"></span>' +
      '<span class="analyzing-dot"></span>' +
      '</div>' +
      '<span style="font-size:12px;font-weight:500;color:#007aff;">Analisi in corso…</span>';
    area.appendChild(ind);
  } else {
    if (existing) existing.remove();
  }
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

function salvaSessione(esito) {
  if (!currentActivity) return;
  var dpiMancanti   = Object.keys(dpiState).filter(function(k) { return dpiState[k] === false; });
  var dpiVerificati = Object.keys(dpiState).filter(function(k) { return dpiState[k] === true; });
  fetch('/api/sessioni', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operatore:      operatoreCorrente,
      attivita:       currentActivity,
      dpi_mancanti:   dpiMancanti,
      dpi_verificati: dpiVerificati,
      esito:          esito,
      inizio:         new Date().toISOString(),
      fine:           new Date().toISOString()
    })
  });
}

function addMessage(type, text) {
  var container = document.getElementById('chatMessages');
  var div    = document.createElement('div');
  div.className = 'msg ' + type;
  var sender = document.createElement('div');
  sender.className = 'msg-sender';
  sender.textContent = type === 'user' ? operatoreCorrente : type === 'alert' ? 'Alert' : 'Lab-Safe';
  div.appendChild(sender);
  div.appendChild(document.createTextNode(text));
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  if (speechOutputEnabled && (type === 'bot' || type === 'success' || type === 'alert')) {
  leggiRisposta(text);
}
}

function sendMessage() {
  var input = document.getElementById('chatInput');
  var text  = input.value.trim();
  if (!text) return;
  input.value = '';
  addMessage('user', text);
  processUserMessage(text.toLowerCase());
}

function sendQuickReply(text) {
  document.getElementById('quickReplies').style.display = 'none';
  addMessage('user', text);
  processUserMessage(text);
}

function processUserMessage(text) {
  var dpiRilevati = Object.keys(dpiState).filter(function(k) { return dpiState[k] === true; });
  fetch('/api/dialogflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message:     text,
      sessionId: operatoreCorrente.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now(),
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
    if (streamActive) {
      setTimeout(function() { classificaConTM(); }, 1200);
    } else if (document.getElementById('uploadPreview').style.display !== 'none') {
      setTimeout(function() { classificaConTM(); }, 1200);
    } else {
      addMessage('bot', 'Attività registrata. Avvia la webcam o carica un\'immagine per analizzare i DPI.');
    }
}

   if (data.reply) {
  var tipo = 'bot';
  var testo = data.reply;
  if (data.intent === 'Default Fallback Intent') {
    tipo = 'alert';
  }
  if (data.intent === 'Default Welcome Intent') {
    testo = 'Ciao ' + operatoreCorrente + '! Sono Lab-Safe, il tuo assistente per la sicurezza in laboratorio. Quale attività vuoi svolgere oggi?';
  }
  if (data.intent !== 'Inizio_Attivita') {
    addMessage(tipo, testo);
  }
}

    if (!data.attivita && !currentActivity && (!data.intent || data.intent === 'Default Fallback Intent')) {
      addMessage('bot', 'Attività non riconosciuta. Prova con: "miscelazione acidi", "uso fiamme", "uso solventi" o "titolazione".');
    }
  })
  .catch(function() {
    addMessage('bot', 'Errore di connessione al server. Riprova.');
  });
}

function simulateDPIDetection(activityKey) {
  showAnalyzing(true);
  var richiesti = DPI_RICHIESTI[activityKey] || [];
  var tutti     = ['occhiali', 'guanti', 'mascherina', 'camice'];
  var mancante  = richiesti[Math.floor(Math.random() * richiesti.length)];
  setTimeout(function() {
    showAnalyzing(false);
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
  }, 1500);
}

async function caricaModelloTM() {
  try {
    var modelURL    = tmModelURL + 'model.json';
    var metadataURL = tmModelURL + 'metadata.json';
    tmModel = await tmImage.load(modelURL, metadataURL);
    console.log('[TM] Modello caricato.');
  } catch(e) {
    console.error('[TM] Errore caricamento modello:', e);
  }
}

async function classificaConTM() {
  if (!tmModel) return;
  if (!currentActivity) return;

  var source = null;
  var isVideo = false;
  if (streamActive) {
    var video = document.getElementById('videoFeed');
    if (!video || video.readyState < 2) return; // video non ancora pronto
    source = video;
    isVideo = true;
  } else {
    var preview = document.getElementById('uploadPreview');
    if (!preview || preview.style.display === 'none' || !preview.src) return;
    source = preview;
  }

  try {
    // 1. Estrai il frame in Base64
    var canvas = document.createElement('canvas');
    if (isVideo) {
      canvas.width = source.videoWidth;
      canvas.height = source.videoHeight;
    } else {
      canvas.width = source.naturalWidth;
      canvas.height = source.naturalHeight;
    }
    var ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    var base64Img = canvas.toDataURL('image/jpeg', 0.8);

    // 2. Invia al backend per estrazione ROI
    showAnalyzing(true);
    var res = await fetch('/api/process-frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Img })
    });
    var data = await res.json();
    showAnalyzing(false);

    if (data.status !== 'ok' || !data.face_rois || data.face_rois.length === 0) {
      console.warn('[TM] Nessun volto rilevato da YOLOv8 o errore:', data.message);
      var oldOverlay = document.getElementById('roiOverlay');
      if (oldOverlay) oldOverlay.style.display = 'none';
      return; // Salta l'inferenza se non ci sono volti
    }

    // Visualizza la ROI a schermo
    var roiOverlay = document.getElementById('roiOverlay');
    if (!roiOverlay) {
      roiOverlay = document.createElement('div');
      roiOverlay.id = 'roiOverlay';
      roiOverlay.style.cssText = 'position:absolute; bottom:16px; right:16px; width:76px; height:76px; border:2px solid #34c759; border-radius:10px; overflow:hidden; z-index:10; box-shadow: 0 4px 12px rgba(0,0,0,0.3); background:#000;';
      roiOverlay.innerHTML = '<img id="roiImageDisplay" style="width:100%; height:100%; object-fit:cover;" /><div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.7); color:white; font-size:9px; text-align:center; padding:3px 0; font-weight:600; letter-spacing:0.05em;">FACE ROI</div>';
    }
    
    // Assicurati che il contenitore sia relative e appendi l'overlay
    var parentArea = isVideo ? document.getElementById('webcamArea') : document.getElementById('uploadArea');
    if (parentArea) {
      parentArea.style.position = 'relative';
      if (roiOverlay.parentNode !== parentArea) parentArea.appendChild(roiOverlay);
    }
    
    roiOverlay.style.display = 'block';
    document.getElementById('roiImageDisplay').src = data.face_rois[0];

    // 3. Esegui l'inferenza TM sulla Face ROI
    var roiImg = new Image();
    roiImg.onload = async function() {
      var predictions = await tmModel.predict(roiImg);
      console.log('[TM] Predictions on ROI:', predictions);

      var occhiali   = false;
      var mascherina = false;
      var maxConf    = 0;

      predictions.forEach(function(p) {
        if (p.probability > maxConf) maxConf = p.probability;
        var cls = p.className.toLowerCase();
        if (cls === 'occhiali'   && p.probability > 0.6) occhiali   = true;
        if (cls === 'mascherina' && p.probability > 0.6) mascherina = true;
        if (cls === 'entrambi'   && p.probability > 0.6) { occhiali = true; mascherina = true; }
      });

      updateDPI('occhiali',   occhiali,   true);
      updateDPI('mascherina', mascherina, true);
      updateDPI('guanti',     false,      true);
      updateDPI('camice',     false,      true);
      updateConfidence(Math.round(maxConf * 100));
      checkCompliance();
    };
    roiImg.src = data.face_rois[0];

  } catch(e) {
    showAnalyzing(false);
    console.error('[TM] Errore classificazione:', e);
  }
}

var tmInterval = null;

function avviaLoopTM() {
  if (tmInterval) clearInterval(tmInterval);
  tmInterval = setInterval(function() {
    if (streamActive && currentActivity && tmModel) {
      classificaConTM();
    }
  }, 2000); // ogni 2 secondi
}

function fermaLoopTM() {
  if (tmInterval) { clearInterval(tmInterval); tmInterval = null; }
}

function apriStorico() {
  document.getElementById('modalOverlay').classList.add('open');
  caricaStorico();
}

function chiudiStorico() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function switchModalTab(tab) {
  var accessi      = document.getElementById('contentAccessi');
  var statistiche  = document.getElementById('contentStatistiche');
  var tabA         = document.getElementById('tabAccessi');
  var tabS         = document.getElementById('tabStatistiche');
  if (tab === 'accessi') {
    accessi.style.display     = '';
    statistiche.style.display = 'none';
    tabA.classList.add('active');
    tabS.classList.remove('active');
  } else {
    accessi.style.display     = 'none';
    statistiche.style.display = '';
    tabS.classList.add('active');
    tabA.classList.remove('active');
    disegnaStatistiche();
  }
}

function caricaStorico() {
  fetch('/api/sessioni')
    .then(function(r) { return r.json(); })
    .then(function(rows) {
      var list = document.getElementById('logList');
      list.innerHTML = '';
      if (rows.length === 0) {
        list.innerHTML = '<p style="font-size:12px;color:#8e8e93;text-align:center;padding:16px">Nessuna sessione registrata</p>';
        return;
      }
      rows.forEach(function(row) {
        var initials = row.operatore.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
        var isOk     = row.esito === 'conforme';
        var orario   = new Date(row.fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        var attivita = (row.attivita || '').replace(/_/g, ' ');
        var mancanti = JSON.parse(row.dpi_mancanti || '[]');
        var dettaglio = isOk ? attivita : attivita + (mancanti.length ? ' · mancava ' + mancanti.join(', ') : '');
        var item = document.createElement('div');
        item.className = 'log-item';
        item.innerHTML =
          '<div class="log-avatar">' + initials + '</div>' +
          '<div><div class="log-name">' + row.operatore + '</div><div class="log-detail">' + dettaglio + '</div></div>' +
          '<span class="log-badge ' + (isOk ? 'ok' : 'warn') + '">' + (isOk ? 'Conforme' : 'Violazione') + '</span>' +
          '<span class="log-time">' + orario + '</span>';
        list.appendChild(item);
      });
    });

  fetch('/api/statistiche')
    .then(function(r) { return r.json(); })
    .then(function(s) {
      document.getElementById('statTotale').textContent    = s.totale;
      document.getElementById('statConformi').textContent  = s.conformi;
      document.getElementById('statViolazioni').textContent = s.violazioni;
      disegnaLinea(s.ultimi7);
    });
}

function disegnaLinea(dati) {
  var svg    = document.getElementById('lineChart');
  var giorni = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
  var oggi   = new Date();
  var punti  = [];
  for (var i = 6; i >= 0; i--) {
    var d   = new Date(oggi); d.setDate(oggi.getDate() - i);
    var key = d.toISOString().slice(0, 10);
    var row = dati.find(function(r) { return r.giorno === key; });
    punti.push(row ? row.n : 0);
  }
  var max  = Math.max.apply(null, punti) || 1;
  var W    = 460; var H = 60; var pad = 5;
  var coords = punti.map(function(v, i) {
    return { x: Math.round(i * (W / 6)), y: Math.round(H - pad - (v / max) * (H - pad * 2)) };
  });

  var isDark  = document.body.classList.contains('dark');
  var lineCol = isDark ? '#0a84ff' : '#007aff';
  var textCol = isDark ? '#636366' : '#8e8e93';
  var areaCol = isDark ? 'rgba(10,132,255,0.1)' : 'rgba(0,122,255,0.08)';

  var pathD   = coords.map(function(c, i) { return (i === 0 ? 'M' : 'L') + c.x + ',' + c.y; }).join(' ');
  var areaD   = pathD + ' L' + coords[coords.length-1].x + ',70 L0,70 Z';

  svg.innerHTML =
    '<defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + lineCol + '" stop-opacity="0.15"/><stop offset="100%" stop-color="' + lineCol + '" stop-opacity="0"/></linearGradient></defs>' +
    '<path d="' + areaD + '" fill="url(#lg)"/>' +
    '<polyline points="' + coords.map(function(c) { return c.x + ',' + c.y; }).join(' ') + '" fill="none" stroke="' + lineCol + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    coords.map(function(c) { return '<circle cx="' + c.x + '" cy="' + c.y + '" r="3.5" fill="' + lineCol + '"/>'; }).join('') +
    giorni.map(function(g, i) {
      var x = Math.round(i * (W / 6));
      return '<text x="' + x + '" y="78" text-anchor="middle" font-size="9" fill="' + textCol + '">' + g + '</text>';
    }).join('');
}

function disegnaStatistiche() {
  fetch('/api/statistiche')
    .then(function(r) { return r.json(); })
    .then(function(s) {
      var isDark  = document.body.classList.contains('dark');
      var bgCirc  = isDark ? '#2c2c2e' : '#f2f2f7';

      // Donut
      var tot  = s.totale || 1;
      var perc = Math.round((s.conformi / tot) * 100);
      var circ = 2 * Math.PI * 28;
      var okArc = (s.conformi / tot) * circ;
      var svg  = document.getElementById('donutChart');
      svg.innerHTML =
        '<circle cx="40" cy="40" r="28" fill="none" stroke="' + bgCirc + '" stroke-width="11"/>' +
        '<circle cx="40" cy="40" r="28" fill="none" stroke="#34c759" stroke-width="11" stroke-dasharray="' + okArc.toFixed(1) + ' ' + (circ - okArc).toFixed(1) + '" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 40 40)"/>' +
        '<circle cx="40" cy="40" r="28" fill="none" stroke="#ff3b30" stroke-width="11" stroke-dasharray="' + (circ - okArc).toFixed(1) + ' ' + okArc.toFixed(1) + '" stroke-dashoffset="-' + okArc.toFixed(1) + '" stroke-linecap="round" transform="rotate(-90 40 40)"/>' +
        '<text x="40" y="36" text-anchor="middle" font-size="13" font-weight="500" fill="' + (isDark ? '#f2f2f7' : '#1c1c1e') + '">' + perc + '%</text>' +
        '<text x="40" y="49" text-anchor="middle" font-size="7" fill="' + (isDark ? '#636366' : '#8e8e93') + '">conformi</text>';

      var legend = document.getElementById('donutLegend');
      legend.innerHTML =
        '<div class="donut-legend-item"><div class="donut-dot" style="background:#34c759"></div>OK · ' + s.conformi + '</div>' +
        '<div class="donut-legend-item"><div class="donut-dot" style="background:#ff3b30"></div>Viol. · ' + s.violazioni + '</div>';

      // Barre DPI
      var dpiList = document.getElementById('dpiBarList');
      dpiList.innerHTML = '';
      var dpi    = s.dpi_mancanti || {};
      var maxDPI = Math.max.apply(null, Object.values(dpi).concat([1]));
      ['mascherina','camice','guanti','occhiali'].forEach(function(k) {
        var n   = dpi[k] || 0;
        var pct = Math.round((n / maxDPI) * 100);
        dpiList.innerHTML +=
          '<div class="dpi-bar-row">' +
          '<span class="dpi-bar-label">' + k.charAt(0).toUpperCase() + k.slice(1) + '</span>' +
          '<div class="dpi-bar-track"><div class="dpi-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<span class="dpi-bar-count">' + n + '</span></div>';
      });

      // Bolle attività
      var bubbleWrap = document.getElementById('bubbleWrap');
      bubbleWrap.innerHTML = '';
      var colori = ['#007aff','#34c759','#ff9500','#ff3b30'];
      var maxN   = Math.max.apply(null, s.per_attivita.map(function(r) { return r.n; }).concat([1]));
      s.per_attivita.slice(0, 4).forEach(function(row, i) {
        var size = Math.round(28 + (row.n / maxN) * 42);
        var label = row.attivita.replace(/_/g, ' ').replace(' ', '<br>');
        bubbleWrap.innerHTML +=
          '<div class="bubble-col">' +
          '<div class="bubble" style="width:' + size + 'px;height:' + size + 'px;background:' + colori[i] + '">' + row.n + '</div>' +
          '<div class="bubble-lbl">' + label + '</div></div>';
      });
    });
}

var recognition = null;
var speechEnabled = false;

function inizializzaVoce() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'it-IT';
  recognition.continuous = false;
  recognition.interimResults = false;
  speechEnabled = true;

  recognition.onresult = function(event) {
    var testo = event.results[0][0].transcript;
    document.getElementById('micBtn').classList.remove('listening');
    document.getElementById('micIcon').className = 'ti ti-microphone';
    addMessage('user', testo);
    processUserMessage(testo.toLowerCase());
  };

  recognition.onend = function() {
    document.getElementById('micBtn').classList.remove('listening');
    document.getElementById('micIcon').className = 'ti ti-microphone';
  };

  recognition.onerror = function() {
    document.getElementById('micBtn').classList.remove('listening');
    document.getElementById('micIcon').className = 'ti ti-microphone';
  };
}

function toggleMic() {
  if (!speechEnabled) {
    addMessage('bot', 'Il riconoscimento vocale non è supportato su questo browser. Usa Chrome o Edge.');
    return;
  }
  var btn = document.getElementById('micBtn');
  if (btn.classList.contains('listening')) {
    recognition.stop();
    btn.classList.remove('listening');
    document.getElementById('micIcon').className = 'ti ti-microphone';
  } else {
    recognition.start();
    btn.classList.add('listening');
    document.getElementById('micIcon').className = 'ti ti-microphone-off';
  }
}

function leggiRisposta(testo) {
  if (!('speechSynthesis' in window)) return;
  var utterance = new SpeechSynthesisUtterance(testo);
  utterance.lang = 'it-IT';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  var voci = window.speechSynthesis.getVoices();
  var alice = voci.find(function(v) { return v.name === 'Alice'; });
  if (alice) utterance.voice = alice;
  window.speechSynthesis.speak(utterance);
}

document.addEventListener('DOMContentLoaded', function() {
  updateClock();
  setInterval(updateClock, 10000);

  // Carica mappatura DPI dal database
  fetch('/api/attivita')
    .then(function(r) { return r.json(); })
    .then(function(rows) {
      rows.forEach(function(row) {
        DPI_RICHIESTI[row.attivita] = JSON.parse(row.dpi);
        RISCHIO_LABEL[row.attivita] = row.rischio + ' · ' + row.attivita.replace(/_/g, ' ');
      });
    });

document.getElementById('speakerBtn').addEventListener('click', function() {
  speechOutputEnabled = !speechOutputEnabled;
  var icon = document.getElementById('speakerIcon');
  icon.className = speechOutputEnabled ? 'ti ti-volume' : 'ti ti-volume-off';
  if (!speechOutputEnabled) {
    window.speechSynthesis.cancel(); // ferma subito qualsiasi voce in corso
  }
});
inizializzaVoce();
document.getElementById('micBtn').addEventListener('click', toggleMic);  
document.getElementById('storicoBtn').addEventListener('click', apriStorico);
document.getElementById('modalClose').addEventListener('click', chiudiStorico);
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) chiudiStorico();
});
document.getElementById('tabAccessi').addEventListener('click', function() { switchModalTab('accessi'); });
document.getElementById('tabStatistiche').addEventListener('click', function() { switchModalTab('statistiche'); });
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

  document.getElementById('welcomeToggle').addEventListener('click', function() {
    toggleTheme();
    var icon  = document.getElementById('welcomeToggleIcon');
    var label = document.getElementById('welcomeToggleLabel');
    icon.className    = currentTheme === 'dark' ? 'ti ti-sun'  : 'ti ti-moon';
    label.textContent = currentTheme === 'dark' ? 'Light' : 'Dark';
  });

  document.getElementById('startAppBtn').addEventListener('click', function() {
    var nome = document.getElementById('operatoreInput').value.trim();
    if (!nome) {
      document.getElementById('operatoreInput').style.border = '2px solid #ff453a';
      return;
    }
    operatoreCorrente = nome;
    document.getElementById('welcomeScreen').classList.add('hidden');
    addMessage('bot', 'Ciao ' + nome + '! Sono Lab-Safe, il tuo assistente per la sicurezza in laboratorio. Quale attività vuoi svolgere oggi?');
  });
  caricaModelloTM();
});