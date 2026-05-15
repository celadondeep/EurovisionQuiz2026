const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const WEBHOOK_SECRET = 'eurovizija2026';

app.use('/webhook', express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); }
}));
app.post('/webhook', (req, res) => {
  const sig = req.headers['x-hub-signature-256'];
  const hmac = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(req.rawBody || '').digest('hex');
  if (!sig || sig !== hmac) return res.status(403).send('Forbidden');
  res.status(200).send('OK');
  exec('cd /var/www/eurovizija && git pull origin main && systemctl restart eurovizija', (err, stdout) => {
    if (err) console.error('Webhook klaida:', err);
    else console.log('Auto-update:', stdout);
  });
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/host', (req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));
app.get('/settings', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));

// ── SETTINGS ──────────────────────────────────────
let settings = {
  lobbySeconds: 9 * 60 + 30,
  questionSeconds: 15,
  autoReveal: true,
  autoNext: true,
  autoNextDelay: 3,
};

app.get('/api/settings', (req, res) => res.json(settings));
app.post('/api/settings', express.json(), (req, res) => {
  const s = req.body;
  if (typeof s.lobbySeconds === 'number') settings.lobbySeconds = Math.max(30, Math.min(3600, s.lobbySeconds));
  if (typeof s.questionSeconds === 'number') settings.questionSeconds = Math.max(5, Math.min(120, s.questionSeconds));
  if (typeof s.autoReveal === 'boolean') settings.autoReveal = s.autoReveal;
  if (typeof s.autoNext === 'boolean') settings.autoNext = s.autoNext;
  if (typeof s.autoNextDelay === 'number') settings.autoNextDelay = Math.max(1, Math.min(10, s.autoNextDelay));
  io.emit('settings', settings);
  res.json({ ok: true, settings });
});

// ── ROUNDS ────────────────────────────────────────
const ROUNDS = [
  {
    name: "1 etapas: Istorija",
    questions: [
      { q: "Kiek kartų Švedija laimėjo Euroviziją?", opts: ["3 kartus", "5 kartus", "7 kartus", "9 kartus"], correct: 2, fact: "Švedija laimėjo 1974, 1984, 1991, 1999, 2012, 2015 ir 2023 m. – daugiausia istorijoje!" },
      { q: "Ar Sovietų Sąjunga kada nors dalyvavo Eurovizijoje?", opts: ["Taip", "Ne"], correct: 1, fact: "SSRS niekada nedalyvavo – konkursas buvo laikomas Vakarų propaganda. Rusija debiutavo tik 1994 m." },
      { q: "Kuri šalis laimėjo pirmąją Euroviziją 1956 m.?", opts: ["Prancūzija", "Italija", "Vokietija", "Šveicarija"], correct: 3, fact: "Šveicarija laimėjo su Lys Assia ir daina 'Refrain' pirmajame konkurse Lugane." },
      { q: "Kokia aukščiausia vieta, kurią Lietuva užėmė Eurovizijoje?", opts: ["2 vieta", "4 vieta", "6 vieta", "10 vieta"], correct: 2, fact: "LT United 2006 m. su 'We Are The Winners' – 6 vieta. The Roop 2021 m. užėmė 8 vietą." },
      { q: "Kuri dingusi valstybė laimėjo Euroviziją 1989 m.?", opts: ["Čekoslovakija", "Rytų Vokietija", "Jugoslavija", "Sovietų Sąjunga"], correct: 2, fact: "Jugoslavija laimėjo su Riva ir 'Rock Me'. Vos po dvejų metų šalis žlugo." },
      { q: "Kiek kartų Airija laimėjo Euroviziją?", opts: ["3 kartus", "5 kartus", "7 kartus", "11 kartų"], correct: 2, fact: "Airija laimėjo 7 kartus! 1992–1994 m. laimėjo tris kartus iš eilės." },
    ]
  },
  {
    name: "2 etapas: Lietuva",
    questions: [
      { q: "Kiek kartų Aistė Pilvelytė dalyvavo nacionalinėje atrankoje?", opts: ["4 kartus", "7 kartus", "11 kartų", "15 kartų"], correct: 2, fact: "11 kartų! Aistė Pilvelytė tapo savotišku lietuviško Eurovizijos humoro simboliu." },
      { q: "Kuriais metais Lietuva debiutavo Eurovizijoje?", opts: ["1990 m.", "1992 m.", "1994 m.", "1998 m."], correct: 2, fact: "Lietuva pirmą kartą dalyvavo 1994 m. Dublino konkurse." },
      { q: "Ar Lietuva kada nors surengė Euroviziją?", opts: ["Taip", "Ne"], correct: 1, fact: "Ne – Lietuva dar nėra laimėjusi Eurovizijos, todėl ir niekada jos nerengė." },
      { q: "Kas atstovavo Lietuvai 2021 m. Eurovizijoje?", opts: ["Fusedmarc", "The Roop", "Monika Liu", "Jurij Veklenko"], correct: 1, fact: "The Roop su 'Discoteque' užėmė puikią 8 vietą Roterdame." },
      { q: "Kaip vadinosi grupė, kuri Lietuvai atnešė 6 vietą 2006 m.?", opts: ["Skamp", "InCulto", "LT United", "Donny Montell"], correct: 2, fact: "'We Are The Winners' – tai turbūt žinomiausias Lietuvos Eurovizijos momentas." },
    ]
  },
  {
    name: "3 etapas: ABBA ir faktai",
    questions: [
      { q: "Kuriais metais ABBA laimėjo Euroviziją?", opts: ["1970 m.", "1974 m.", "1978 m.", "1982 m."], correct: 1, fact: "ABBA laimėjo 1974 m. Braitone su 'Waterloo'." },
      { q: "Kokioje šalyje ABBA atstovavo Eurovizijoje?", opts: ["Norvegijoje", "Danijoje", "Suomijoje", "Švedijoje"], correct: 3, fact: "ABBA atstovavo Švedijai – tai viena iš priežasčių, kodėl Švedija asocijuojasi su Eurovizija." },
      { q: "Kiek taškų yra didžiausias balas Eurovizijoje?", opts: ["8 taškai", "10 taškų", "12 taškų", "15 taškų"], correct: 2, fact: "'Douze points!' – 12 taškų yra didžiausias balas. Šis šauksmas tapo Eurovizijos simboliu." },
      { q: "Kuriais metais Ukraina pirmą kartą laimėjo Euroviziją?", opts: ["2000 m.", "2004 m.", "2008 m.", "2012 m."], correct: 1, fact: "Ruslana su 'Wild Dances' 2004 m. Stambule. Ukraina laimėjo dar 2016 ir 2022 m." },
      { q: "Kurioje šalyje pirmą kartą vyko Eurovizija?", opts: ["Prancūzijoje", "Vokietijoje", "Italijoje", "Šveicarijoje"], correct: 3, fact: "1956 m. Lugane, Šveicarijoje. EBU sukūrė konkursą suvienyti pokario Europą per televiziją." },
      { q: "Kuri šalis daugiausiai kartų gavo 0 taškų?", opts: ["Austrija", "Norvegija", "Prancūzija", "Vokietija"], correct: 1, fact: "Norvegija gavo 0 taškų net 4 kartus – daugiau nei bet kuri kita šalis!" },
    ]
  }
];

// ── GAME STATE ────────────────────────────────────
let gameState = {
  phase: 'lobby',
  players: {},
  round: 0,
  question: 0,
  answerRevealed: false,
  answers: {},
  scores: {},
  questionTimer: null,
  timeLeft: 15,
  lobbyTimeLeft: 9 * 60 + 30,
  lobbyTimer: null,
  cheaters: {},
};

function resetGame() {
  if (gameState.questionTimer) clearInterval(gameState.questionTimer);
  if (gameState.lobbyTimer) clearInterval(gameState.lobbyTimer);
  gameState = {
    phase: 'lobby', players: {}, round: 0, question: 0,
    answerRevealed: false, answers: {}, scores: {},
    questionTimer: null, timeLeft: settings.questionSeconds,
    lobbyTimeLeft: settings.lobbySeconds, lobbyTimer: null,
    cheaters: {},
  };
  // Jei host jau prisijunges - is karto pradeti laikmati
  if (hostConnected) {
    startLobbyTimer();
    io.emit('lobby_timer', { timeLeft: gameState.lobbyTimeLeft });
  }
}

function currentQ() {
  return ROUNDS[gameState.round]?.questions[gameState.question] || null;
}

function getPublicState() {
  const q = currentQ();
  return {
    phase: gameState.phase,
    round: gameState.round,
    roundName: ROUNDS[gameState.round]?.name || '',
    question: gameState.question,
    totalQuestions: ROUNDS[gameState.round]?.questions.length || 0,
    totalRounds: ROUNDS.length,
    questionText: q?.q || '',
    options: q?.opts || [],
    optionCount: q?.opts?.length || 4,
    correctIndex: gameState.answerRevealed ? q?.correct : null,
    fact: gameState.answerRevealed ? (q?.fact || '') : null,
    answerRevealed: gameState.answerRevealed,
    players: gameState.players,
    scores: gameState.scores,
    answers: gameState.answers,
    timeLeft: gameState.timeLeft,
    lobbyTimeLeft: gameState.lobbyTimeLeft,
    cheaters: gameState.cheaters,
    settings: settings,
  };
}

// ── LOBBY TIMER ───────────────────────────────────
let hostConnected = false;

function startLobbyTimer() {
  if (gameState.lobbyTimer) clearInterval(gameState.lobbyTimer);
  gameState.lobbyTimer = setInterval(() => {
    if (!hostConnected) return; // neskaiciuoti jei host neprisijunges
    gameState.lobbyTimeLeft--;
    io.emit('lobby_timer', { timeLeft: gameState.lobbyTimeLeft });
    if (gameState.lobbyTimeLeft <= 0) {
      clearInterval(gameState.lobbyTimer);
      gameState.lobbyTimer = null;
    }
  }, 1000);
}

function startGame() {
  gameState.phase = 'question';
  gameState.round = 0;
  gameState.question = 0;
  gameState.answerRevealed = false;
  gameState.answers = {};
  startQuestionTimer();
  io.emit('state', getPublicState());
}

// ── QUESTION TIMER ────────────────────────────────
function startQuestionTimer() {
  if (gameState.questionTimer) clearInterval(gameState.questionTimer);
  gameState.timeLeft = settings.questionSeconds;
  gameState.questionTimer = setInterval(() => {
    gameState.timeLeft--;
    io.emit('timer', { timeLeft: gameState.timeLeft });
    if (gameState.timeLeft <= 0) {
      clearInterval(gameState.questionTimer);
      gameState.questionTimer = null;
      if (!gameState.answerRevealed && settings.autoReveal) {
        revealAnswer();
        if (settings.autoNext) {
          setTimeout(() => nextQuestion(), settings.autoNextDelay * 1000);
        }
      }
    }
  }, 1000);
}

function revealAnswer() {
  if (gameState.answerRevealed) return;
  gameState.answerRevealed = true;
  const q = currentQ();
  Object.entries(gameState.answers).forEach(([pid, data]) => {
    if (data.optionIndex === q.correct) {
      gameState.scores[pid] = (gameState.scores[pid] || 0) + 1;
    }
  });
  io.emit('state', getPublicState());
}

function nextQuestion() {
  const round = ROUNDS[gameState.round];
  gameState.answerRevealed = false;
  gameState.answers = {};
  if (gameState.question < round.questions.length - 1) {
    gameState.question++;
  } else if (gameState.round < ROUNDS.length - 1) {
    gameState.round++;
    gameState.question = 0;
  } else {
    gameState.phase = 'final';
    io.emit('state', getPublicState());
    return;
  }
  startQuestionTimer();
  io.emit('state', getPublicState());
}

// ── SOCKET.IO ─────────────────────────────────────
io.on('connection', (socket) => {
  const isHost = socket.handshake.query.role === 'host';
  if (isHost) {
    socket.join('host');
    socket.emit('state', getPublicState());
    socket.emit('settings', settings);
    // Pradeti laikmati tik kai host prisijungia
    if (gameState.phase === 'lobby') {
      hostConnected = true;
      if (!gameState.lobbyTimer) {
        gameState.lobbyTimeLeft = settings.lobbySeconds;
        startLobbyTimer();
      }
      // Siusti esamą laiką visiems žaidėjams
      io.emit('lobby_timer', { timeLeft: gameState.lobbyTimeLeft });
    }
  }

  socket.on('join', ({ name }) => {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) return;

    // Patikrinti ar vardas jau uzimtas
    const nameTaken = Object.values(gameState.players).some(p => p.name.toLowerCase() === trimmed.toLowerCase());
    if (nameTaken) {
      socket.emit('join_error', { message: 'Toks vardas jau užimtas! Pasirink kitą.' });
      return;
    }

    gameState.players[socket.id] = { name: trimmed, id: socket.id };
    if (gameState.scores[socket.id] === undefined) gameState.scores[socket.id] = 0;
    if (gameState.cheaters[socket.id] === undefined) gameState.cheaters[socket.id] = 0;
    io.emit('state', getPublicState());
    socket.emit('joined', { id: socket.id, name: trimmed });
    // Siusti esama lobby laika naujam zaidejiui
    socket.emit('lobby_timer', { timeLeft: gameState.lobbyTimeLeft });
  });

  socket.on('host:start', () => startGame());
  socket.on('host:reveal', () => revealAnswer());
  socket.on('host:next', () => {
    if (gameState.questionTimer) { clearInterval(gameState.questionTimer); gameState.questionTimer = null; }
    nextQuestion();
  });

  socket.on('host:prev', () => {
    if (gameState.questionTimer) { clearInterval(gameState.questionTimer); gameState.questionTimer = null; }
    gameState.answerRevealed = false; gameState.answers = {};
    if (gameState.question > 0) { gameState.question--; }
    else if (gameState.round > 0) { gameState.round--; gameState.question = ROUNDS[gameState.round].questions.length - 1; }
    startQuestionTimer();
    io.emit('state', getPublicState());
  });

  socket.on('host:jump', ({ round }) => {
    if (gameState.questionTimer) { clearInterval(gameState.questionTimer); gameState.questionTimer = null; }
    gameState.round = round; gameState.question = 0;
    gameState.answerRevealed = false; gameState.answers = {};
    startQuestionTimer();
    io.emit('state', getPublicState());
  });

  socket.on('host:adjust', ({ playerId, pts }) => {
    if (gameState.scores[playerId] !== undefined) {
      gameState.scores[playerId] = Math.max(0, (gameState.scores[playerId] || 0) + pts);
      io.emit('state', getPublicState());
    }
  });

  socket.on('host:reset', () => { resetGame(); io.emit('state', getPublicState()); });

  socket.on('host:lobby_pause', () => {
    if (gameState.lobbyTimer) { clearInterval(gameState.lobbyTimer); gameState.lobbyTimer = null; }
  });

  socket.on('host:lobby_resume', () => {
    if (!gameState.lobbyTimer) startLobbyTimer();
  });

  socket.on('player:answer', ({ optionIndex }) => {
    if (gameState.phase !== 'question' || gameState.answerRevealed) return;
    if (!gameState.players[socket.id] || gameState.answers[socket.id]) return;
    gameState.answers[socket.id] = { optionIndex, name: gameState.players[socket.id].name, time: Date.now() };
    io.emit('state', getPublicState());
  });

  socket.on('player:blur', () => {
    if (!gameState.players[socket.id]) return;
    gameState.cheaters[socket.id] = (gameState.cheaters[socket.id] || 0) + 1;
    const name = gameState.players[socket.id].name;
    const count = gameState.cheaters[socket.id];
    io.to('host').emit('cheat_alert', { name, count, id: socket.id });
    io.emit('state', getPublicState());
  });

  socket.on('disconnect', () => {
    if (isHost) {
      hostConnected = false;
      console.log('Host atsijunge - laikmatis sustojo');
    }
    if (gameState.players[socket.id]) { delete gameState.players[socket.id]; io.emit('state', getPublicState()); }
  });
});

// Lobby timer starts only when host connects;

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎤 Eurovizija Quiz serveris veikia!`);
  console.log(`   Vedėjas:   http://localhost:${PORT}/host`);
  console.log(`   Žaidėjai:  http://localhost:${PORT}/`);
  console.log(`   Nustatymai: http://localhost:${PORT}/settings\n`);
});
