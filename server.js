const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Webhook secret - pakeisk i savo
const WEBHOOK_SECRET = 'eurovizija2026';

// Webhook endpoint TURI buti pries express.static!
app.use('/webhook', express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); }
}));

app.post('/webhook', (req, res) => {
  const sig = req.headers['x-hub-signature-256'];
  const hmac = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(req.rawBody || '').digest('hex');

  if (!sig || sig !== hmac) {
    console.log('Webhook: neteisingas parasas');
    return res.status(403).send('Forbidden');
  }

  res.status(200).send('OK');
  console.log('Webhook gautas - atnaujinama...');

  exec('cd /var/www/eurovizija && git pull origin main && systemctl restart eurovizija', (err, stdout, stderr) => {
    if (err) console.error('Webhook klaida:', err);
    else console.log('Auto-update sekmingai:', stdout);
  });
});

app.use(express.static(path.join(__dirname, 'public')));
app.get("/host", (req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));

const ROUNDS = [
  {
    name: "1 etapas: Istorija",
    questions: [
      { q: "Kiek kartų Švedija laimėjo Euroviziją?", opts: ["5 kartus", "6 kartus", "7 kartus", "8 kartus"], correct: 2, fact: "Švedija laimėjo 1974, 1984, 1991, 1999, 2012, 2015 ir 2023 m. – daugiausia istorijoje!" },
      { q: "Ar Sovietų Sąjunga kada nors dalyvavo Eurovizijoje?", opts: ["Taip", "Ne"], correct: 1, fact: "SSRS niekada nedalyvavo – konkursas buvo laikomas Vakarų propaganda. Rusija debiutavo tik 1994 m." },
      { q: "Kuri šalis laimėjo pirmąją Euroviziją 1956 m.?", opts: ["Prancūzija", "Italija", "Šveicarija", "Vokietija"], correct: 2, fact: "Šveicarija laimėjo su Lys Assia ir daina 'Refrain' pirmajame konkurse Lugane." },
      { q: "Kokia aukščiausia vieta, kurią Lietuva užėmė Eurovizijoje?", opts: ["3 vieta", "6 vieta", "8 vieta"], correct: 1, fact: "LT United 2006 m. su 'We Are The Winners' – 6 vieta. The Roop 2021 m. užėmė 8 vietą." },
      { q: "Kuri dingusi valstybė laimėjo Euroviziją 1989 m.?", opts: ["Čekoslovakija", "Rytų Vokietija", "Jugoslavija", "Sovietų Sąjunga"], correct: 2, fact: "Jugoslavija laimėjo su Riva ir 'Rock Me'. Vos po dvejų metų šalis žlugo." },
      { q: "Kiek kartų Airija laimėjo Euroviziją?", opts: ["5 kartus", "7 kartus", "3 kartus"], correct: 1, fact: "Airija laimėjo 7 kartus – tiek pat kiek Švedija! 1992–1994 m. laimėjo tris kartus iš eilės." },
    ]
  },
  {
    name: "2 etapas: Lietuva",
    questions: [
      { q: "Kiek kartų Aistė Pilvelytė dalyvavo nacionalinėje atrankoje?", opts: ["4 kartus", "7 kartus", "9 kartus", "11 kartų"], correct: 3, fact: "11 kartų! Aistė Pilvelytė tapo savotišku lietuviško Eurovizijos humoro simboliu." },
      { q: "Kuriais metais Lietuva debiutavo Eurovizijoje?", opts: ["1992 m.", "1994 m.", "1996 m."], correct: 1, fact: "Lietuva pirmą kartą dalyvavo 1994 m. Dublino konkurse – netrukus po Nepriklausomybės atkūrimo." },
      { q: "Ar Lietuva kada nors surengė Euroviziją?", opts: ["Taip", "Ne"], correct: 1, fact: "Ne – Lietuva dar nėra laimėjusi Eurovizijos, todėl ir niekada jos nerengė." },
      { q: "Kas atstovavo Lietuvai 2021 m. Eurovizijoje?", opts: ["Fusedmarc", "Jurij Veklenko", "The Roop", "Monika Liu"], correct: 2, fact: "The Roop su 'Discoteque' užėmė puikią 8 vietą Roterdame – tai buvo vienas ryškiausių pasirodymų." },
      { q: "Kaip vadinosi grupė, kuri Lietuvai atnešė 6 vietą 2006 m.?", opts: ["Skamp", "LT United", "InCulto", "Donny Montell"], correct: 1, fact: "'We Are The Winners' – tai turbūt žinomiausias Lietuvos Eurovizijos momentas." },
    ]
  },
  {
    name: "3 etapas: ABBA ir faktai",
    questions: [
      { q: "Kuriais metais ABBA laimėjo Euroviziją?", opts: ["1972 m.", "1974 m.", "1976 m.", "1978 m."], correct: 1, fact: "ABBA laimėjo 1974 m. Braitone su 'Waterloo'. Tai paleido vieną sėkmingiausių grupių karjerą." },
      { q: "Kokioje šalyje ABBA atstovavo Eurovizijoje?", opts: ["Norvegijai", "Danijai", "Švedijai", "Suomijai"], correct: 2, fact: "ABBA atstovavo Švedijai – tai viena iš priežasčių, kodėl Švedija asocijuojasi su Eurovizija." },
      { q: "Kiek taškų yra didžiausias balas Eurovizijoje?", opts: ["10 taškų", "12 taškų", "15 taškų"], correct: 1, fact: "'Douze points!' – 12 taškų yra didžiausias balas. Šis šauksmas tapo Eurovizijos simboliu." },
      { q: "Kuriais metais Ukraina pirmą kartą laimėjo Euroviziją?", opts: ["2002 m.", "2004 m.", "2008 m.", "2010 m."], correct: 1, fact: "Ruslana su 'Wild Dances' 2004 m. Stambule. Ukraina laimėjo dar 2016 ir 2022 m." },
      { q: "Kurioje šalyje pirmą kartą vyko Eurovizija?", opts: ["Prancūzijoje", "JK", "Šveicarijoje", "Italijoje"], correct: 2, fact: "1956 m. Lugane, Šveicarijoje. EBU sukūrė konkursą suvienyti pokario Europą per televiziją." },
      { q: "Kuri šalis daugiausiai kartų gavo 0 taškų (nul points)?", opts: ["Norvegija", "Prancūzija", "Austrija", "Vokietija"], correct: 0, fact: "Norvegija gavo 0 taškų net 4 kartus – daugiau nei bet kuri kita šalis! Tačiau ji taip pat laimėjo 3 kartus." },
    ]
  }
];

let gameState = {
  phase: 'lobby', players: {}, round: 0, question: 0,
  answerRevealed: false, answers: {}, scores: {},
};

function resetGame() {
  gameState = { phase:'lobby', players:{}, round:0, question:0, answerRevealed:false, answers:{}, scores:{} };
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
    correctIndex: gameState.answerRevealed ? q?.correct : null,
    fact: gameState.answerRevealed ? (q?.fact || '') : null,
    answerRevealed: gameState.answerRevealed,
    players: gameState.players,
    scores: gameState.scores,
    answers: gameState.answers,
  };
}

io.on('connection', (socket) => {
  const isHost = socket.handshake.query.role === 'host';
  if (isHost) { socket.join('host'); socket.emit('state', getPublicState()); }

  socket.on('join', ({ name }) => {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) return;
    gameState.players[socket.id] = { name: trimmed, id: socket.id };
    if (gameState.scores[socket.id] === undefined) gameState.scores[socket.id] = 0;
    io.emit('state', getPublicState());
    socket.emit('joined', { id: socket.id, name: trimmed });
  });

  socket.on('host:start', () => {
    gameState.phase = 'question'; gameState.round = 0; gameState.question = 0;
    gameState.answerRevealed = false; gameState.answers = {};
    io.emit('state', getPublicState());
  });

  socket.on('host:reveal', () => {
    gameState.answerRevealed = true;
    const q = currentQ();
    Object.entries(gameState.answers).forEach(([pid, data]) => {
      if (data.optionIndex === q.correct) {
        gameState.scores[pid] = (gameState.scores[pid] || 0) + 1;
      }
    });
    io.emit('state', getPublicState());
  });

  socket.on('host:next', () => {
    const round = ROUNDS[gameState.round];
    gameState.answerRevealed = false; gameState.answers = {};
    if (gameState.question < round.questions.length - 1) { gameState.question++; }
    else if (gameState.round < ROUNDS.length - 1) { gameState.round++; gameState.question = 0; }
    else { gameState.phase = 'final'; }
    io.emit('state', getPublicState());
  });

  socket.on('host:prev', () => {
    gameState.answerRevealed = false; gameState.answers = {};
    if (gameState.question > 0) { gameState.question--; }
    else if (gameState.round > 0) { gameState.round--; gameState.question = ROUNDS[gameState.round].questions.length - 1; }
    io.emit('state', getPublicState());
  });

  socket.on('host:jump', ({ round }) => {
    gameState.round = round; gameState.question = 0;
    gameState.answerRevealed = false; gameState.answers = {};
    io.emit('state', getPublicState());
  });

  socket.on('host:adjust', ({ playerId, pts }) => {
    if (gameState.scores[playerId] !== undefined) {
      gameState.scores[playerId] = Math.max(0, (gameState.scores[playerId] || 0) + pts);
      io.emit('state', getPublicState());
    }
  });

  socket.on('host:reset', () => { resetGame(); io.emit('state', getPublicState()); });

  socket.on('player:answer', ({ optionIndex }) => {
    if (gameState.phase !== 'question' || gameState.answerRevealed) return;
    if (!gameState.players[socket.id] || gameState.answers[socket.id]) return;
    gameState.answers[socket.id] = { optionIndex, name: gameState.players[socket.id].name, time: Date.now() };
    io.emit('state', getPublicState());
  });

  socket.on('disconnect', () => {
    if (gameState.players[socket.id]) { delete gameState.players[socket.id]; io.emit('state', getPublicState()); }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎤 Eurovizija Quiz serveris veikia!`);
  console.log(`   Vedėjas:  http://localhost:${PORT}/host`);
  console.log(`   Žaidėjai: http://localhost:${PORT}/\n`);
});
