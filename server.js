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

const QUESTION_TIME = 15; // sekundes

const ROUNDS = [
  {
    name: "1 etapas: Istorija",
    questions: [
      {
        q: "Kiek kartu Svedija laimejo Eurovizija?",
        opts: ["3 kartus", "5 kartus", "7 kartus", "9 kartus"],
        correct: 2,
        fact: "Svedija laimejo 1974, 1984, 1991, 1999, 2012, 2015 ir 2023 m. – daugiausia istorijoje!"
      },
      {
        q: "Ar Sovietu Sajunga kada nors dalyvavo Eurovizijoje?",
        opts: ["Taip", "Ne"],
        correct: 1,
        fact: "SSRS niekada nedalyvavo – konkursas buvo laikomas Vakaru propaganda. Rusija debiutavo tik 1994 m."
      },
      {
        q: "Kuri salis laimejo pirmaja Eurovizija 1956 m.?",
        opts: ["Prancuzija", "Italija", "Svedija", "Sveicarija"],
        correct: 3,
        fact: "Sveicarija laimejo su Lys Assia ir daina Refrain pirmajame konkurse Lugane."
      },
      {
        q: "Kokia auksciausia vieta Lietuva yra uzemusi Eurovizijoje?",
        opts: ["2 vieta", "4 vieta", "6 vieta", "10 vieta"],
        correct: 2,
        fact: "LT United 2006 m. su We Are The Winners – 6 vieta. The Roop 2021 m. uzeme 8 vieta."
      },
      {
        q: "Kuri dingusi valstybe laimejo Eurovizija 1989 m.?",
        opts: ["Cekoslovakija", "Rytu Vokietija", "Jugoslavija", "Sovietu Sajunga"],
        correct: 2,
        fact: "Jugoslavija laimejo su Riva ir Rock Me. Vos po dveju metu salis zlugo."
      },
      {
        q: "Kiek kartu Airija laimejo Eurovizija?",
        opts: ["3 kartus", "5 kartus", "7 kartus", "11 kartu"],
        correct: 2,
        fact: "Airija laimejo 7 kartus! 1992-1994 m. laimejo tris kartus is eiles."
      },
    ]
  },
  {
    name: "2 etapas: Lietuva",
    questions: [
      {
        q: "Kiek kartu Aiste Pilvelyte dalyvavo nacionalineje atrankoje?",
        opts: ["4 kartus", "7 kartus", "11 kartu", "15 kartu"],
        correct: 2,
        fact: "11 kartu! Aiste Pilvelyte tapo savotiskas lietuvisko Eurovizijos humoro simboliu."
      },
      {
        q: "Kuriais metais Lietuva debiutavo Eurovizijoje?",
        opts: ["1990 m.", "1992 m.", "1994 m.", "1998 m."],
        correct: 2,
        fact: "Lietuva pirma karta dalyvavo 1994 m. Dublino konkurse."
      },
      {
        q: "Ar Lietuva kada nors surenge Eurovizija?",
        opts: ["Taip", "Ne"],
        correct: 1,
        fact: "Ne – Lietuva dar nera laimejusi Eurovizijos, todel ir niekada jos nerenge."
      },
      {
        q: "Kas atstovavo Lietuvai 2021 m. Eurovizijoje?",
        opts: ["Fusedmarc", "The Roop", "Monika Liu", "Jurij Veklenko"],
        correct: 1,
        fact: "The Roop su Discoteque uzeme puikia 8 vieta Roterdame."
      },
      {
        q: "Kaip vadinosi grupe, kuri Lietuvai atanese 6 vieta 2006 m.?",
        opts: ["Skamp", "InCulto", "LT United", "Donny Montell"],
        correct: 2,
        fact: "We Are The Winners – tai turbut zinomiausias Lietuvos Eurovizijos momentas."
      },
    ]
  },
  {
    name: "3 etapas: ABBA ir faktai",
    questions: [
      {
        q: "Kuriais metais ABBA laimejo Eurovizija?",
        opts: ["1970 m.", "1974 m.", "1978 m.", "1982 m."],
        correct: 1,
        fact: "ABBA laimejo 1974 m. Braitone su Waterloo."
      },
      {
        q: "Kokioje salyje ABBA atstovavo Eurovizijoje?",
        opts: ["Norvegijai", "Danijai", "Suomijai", "Svedijai"],
        correct: 3,
        fact: "ABBA atstovavo Svedijai – tai viena is priezasciu, kodel Svedija asocijuojasi su Eurovizija."
      },
      {
        q: "Kiek tasku yra didziausia balas Eurovizijoje?",
        opts: ["8 taskai", "10 tasku", "12 tasku", "15 tasku"],
        correct: 2,
        fact: "Douze points! – 12 tasku yra didziausia balas. Sis sauksmas tapo Eurovizijos simboliu."
      },
      {
        q: "Kuriais metais Ukraina pirma karta laimejo Eurovizija?",
        opts: ["2000 m.", "2004 m.", "2008 m.", "2012 m."],
        correct: 1,
        fact: "Ruslana su Wild Dances 2004 m. Stambule. Ukraina laimejo dar 2016 ir 2022 m."
      },
      {
        q: "Kurioje salyje pirma karta vyko Eurovizija?",
        opts: ["Prancuzijoje", "Vokietijoje", "Sveicarijoje", "Italijoje"],
        correct: 2,
        fact: "1956 m. Lugane, Sveicarijoje. EBU sukure konkursa suvienyti pokario Europa per televizija."
      },
      {
        q: "Kuri salis daugiausiai kartu gavo 0 tasku?",
        opts: ["Austrija", "Norvegija", "Prancuzija", "Vokietija"],
        correct: 1,
        fact: "Norvegija gavo 0 tasku net 4 kartus – daugiau nei bet kuri kita salis!"
      },
    ]
  }
];

let gameState = {
  phase: 'lobby',
  players: {},
  round: 0,
  question: 0,
  answerRevealed: false,
  answers: {},
  scores: {},
  questionTimer: null,
  timeLeft: QUESTION_TIME,
  cheaters: {}, // { socketId: count }
};

function resetGame() {
  if (gameState.questionTimer) clearInterval(gameState.questionTimer);
  gameState = {
    phase: 'lobby', players: {}, round: 0, question: 0,
    answerRevealed: false, answers: {}, scores: {},
    questionTimer: null, timeLeft: QUESTION_TIME, cheaters: {},
  };
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
    optionCount: q?.opts?.length || 0,
    correctIndex: gameState.answerRevealed ? q?.correct : null,
    fact: gameState.answerRevealed ? (q?.fact || '') : null,
    answerRevealed: gameState.answerRevealed,
    players: gameState.players,
    scores: gameState.scores,
    answers: gameState.answers,
    timeLeft: gameState.timeLeft,
    cheaters: gameState.cheaters,
  };
}

function startQuestionTimer() {
  if (gameState.questionTimer) clearInterval(gameState.questionTimer);
  gameState.timeLeft = QUESTION_TIME;
  gameState.questionTimer = setInterval(() => {
    gameState.timeLeft--;
    io.emit('timer', { timeLeft: gameState.timeLeft });
    if (gameState.timeLeft <= 0) {
      clearInterval(gameState.questionTimer);
      gameState.questionTimer = null;
      // Auto-reveal when time runs out
      if (!gameState.answerRevealed) {
        gameState.answerRevealed = true;
        const q = currentQ();
        Object.entries(gameState.answers).forEach(([pid, data]) => {
          if (data.optionIndex === q.correct) {
            gameState.scores[pid] = (gameState.scores[pid] || 0) + 1;
          }
        });
        io.emit('state', getPublicState());
        // Auto next after 3 sec
        setTimeout(() => {
          const round = ROUNDS[gameState.round];
          gameState.answerRevealed = false; gameState.answers = {};
          if (gameState.question < round.questions.length - 1) { gameState.question++; }
          else if (gameState.round < ROUNDS.length - 1) { gameState.round++; gameState.question = 0; }
          else { gameState.phase = 'final'; io.emit('state', getPublicState()); return; }
          startQuestionTimer();
          io.emit('state', getPublicState());
        }, 3000);
      }
    }
  }, 1000);
}

io.on('connection', (socket) => {
  const isHost = socket.handshake.query.role === 'host';
  if (isHost) { socket.join('host'); socket.emit('state', getPublicState()); }

  socket.on('join', ({ name }) => {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) return;
    gameState.players[socket.id] = { name: trimmed, id: socket.id };
    if (gameState.scores[socket.id] === undefined) gameState.scores[socket.id] = 0;
    if (gameState.cheaters[socket.id] === undefined) gameState.cheaters[socket.id] = 0;
    io.emit('state', getPublicState());
    socket.emit('joined', { id: socket.id, name: trimmed });
  });

  socket.on('host:start', () => {
    gameState.phase = 'question'; gameState.round = 0; gameState.question = 0;
    gameState.answerRevealed = false; gameState.answers = {};
    startQuestionTimer();
    io.emit('state', getPublicState());
  });

  socket.on('host:reveal', () => {
    if (gameState.answerRevealed) return;
    if (gameState.questionTimer) { clearInterval(gameState.questionTimer); gameState.questionTimer = null; }
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
    else { gameState.phase = 'final'; io.emit('state', getPublicState()); return; }
    startQuestionTimer();
    io.emit('state', getPublicState());
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

  socket.on('player:answer', ({ optionIndex }) => {
    if (gameState.phase !== 'question' || gameState.answerRevealed) return;
    if (!gameState.players[socket.id] || gameState.answers[socket.id]) return;
    gameState.answers[socket.id] = { optionIndex, name: gameState.players[socket.id].name, time: Date.now() };
    io.emit('state', getPublicState());
  });

  // Anti-cheat: player left app
  socket.on('player:blur', () => {
    if (!gameState.players[socket.id]) return;
    gameState.cheaters[socket.id] = (gameState.cheaters[socket.id] || 0) + 1;
    const name = gameState.players[socket.id].name;
    const count = gameState.cheaters[socket.id];
    io.to('host').emit('cheat_alert', { name, count, id: socket.id });
    io.emit('state', getPublicState());
  });

  socket.on('disconnect', () => {
    if (gameState.players[socket.id]) { delete gameState.players[socket.id]; io.emit('state', getPublicState()); }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n Eurovizija Quiz serveris veikia!`);
  console.log(`   Vedejas:  http://localhost:${PORT}/host`);
  console.log(`   Zaidejai: http://localhost:${PORT}/\n`);
});
