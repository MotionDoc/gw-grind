const GEMINI_URL = '/.netlify/functions/generate';

let uploadedFiles = [];

const fileInput = document.getElementById('fileInput');
const uploadZone = document.getElementById('uploadZone');
const fileList = document.getElementById('fileList');

// Click to upload
fileInput.addEventListener('change', e => handleFiles(e.target.files));

// Drag and drop
uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.style.borderColor = 'var(--accent)';
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.style.borderColor = 'var(--border)';
});

uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.style.borderColor = 'var(--border)';
  handleFiles(e.dataTransfer.files);
});

function handleFiles(files) {
  for (const file of files) {
    if (!uploadedFiles.find(f => f.name === file.name)) {
      uploadedFiles.push(file);
    }
  }
  renderFileList();
  updateBtn();
}

function renderFileList() {
  fileList.innerHTML = '';
  uploadedFiles.forEach((file, i) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const icons = {
      pdf: '📄', jpg: '🖼️', jpeg: '🖼️',
      png: '🖼️', webp: '🖼️', txt: '📝'
    };
    const icon = icons[ext] || '📎';
    const size = (file.size / 1024).toFixed(1) + ' KB';

    fileList.innerHTML += `
      <div class="file-item">
        <span class="file-item-icon">${icon}</span>
        <span class="file-item-name">${file.name}</span>
        <span class="file-item-size">${size}</span>
        <button class="file-item-remove" onclick="removeFile(${i})">✕</button>
      </div>`;
  });
}

function removeFile(i) {
  uploadedFiles.splice(i, 1);
  renderFileList();
  updateBtn();
}

function updateBtn() {
  document.getElementById('generateBtn').disabled = uploadedFiles.length === 0;
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setStatus(msg) {
  document.getElementById('statusText').textContent = msg;
}

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 5000);
}

document.getElementById('generateBtn').addEventListener('click', async () => {
  document.getElementById('generateBtn').disabled = true;
  document.getElementById('loadingBar').classList.add('active');
  document.getElementById('decksSection').style.display = 'none';
  document.getElementById('decksGrid').innerHTML = '';

  const allDecks = [];

  for (const file of uploadedFiles) {
    setStatus(`Scanning ${file.name} line by line...`);

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const b64 = await toBase64(file);
      const mimeMap = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg', jpeg: 'image/jpeg',
        png: 'image/png', webp: 'image/webp',
        txt: 'text/plain'
      };
      const mimeType = mimeMap[ext] || 'application/octet-stream';

const count = document.getElementById('cardCount').value || 15;
const difficulty = document.getElementById('difficulty').value;

const difficultyGuide = {
  basic: 'Focus on basic medical terminology, anatomical structures, simple definitions, and foundational concepts.',
  intermediate: 'Cover physiological processes, biochemical pathways, disease mechanisms, embryological development, and clinical correlations.',
  advanced: 'Include complex biochemical reactions, detailed embryological development, pathophysiology, clinical reasoning, and applied sciences.'
};

const prompt = `You are a preclinical medical flashcard generator designed to help first and second year medical students study effectively. Read through this document carefully, line by line, and extract every important piece of information.

Generate exactly ${count} flashcards from this material at ${difficulty} difficulty level. ${difficultyGuide[difficulty]}

Mix between:
- Q&A format: "What is the function of X?" → "Answer"
- Fill-in-the-blank: "The ___ enzyme catalyzes the conversion of X to Y." → "Answer"
- Clinical correlation: "A deficiency of X presents with..." → "Answer"

Focus on extracting information related to:
- Anatomy — structures, relations, nerve and blood supply
- Physiology — organ systems, mechanisms, regulation
- Biochemistry — metabolic pathways, enzymes, cofactors, energy production
- Embryology — developmental stages, derivatives, congenital anomalies
- Histology — tissue types, cell structures, organ microstructure
- Pathology — disease mechanisms, cellular changes
- Pharmacology — drug classes, mechanisms, side effects
- Microbiology — organisms, virulence factors, infections

Return ONLY a JSON array, no markdown, no explanation. Format:
[{"question":"...","answer":"..."},...]`;

      const body = {
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: b64 } },
            { text: prompt }
          ]
        }]
      };

      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Gemini API error');
      }

      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const clean = raw.replace(/```json|```/g, '').trim();
      const cards = JSON.parse(clean);

      allDecks.push({ name: file.name, cards });

    } catch (err) {
      showError(`Failed on ${file.name}: ${err.message}`);
    }
  }

  if (allDecks.length > 0) {
    renderDecks(allDecks);
    document.getElementById('decksSection').style.display = 'block';
    setStatus(`✓ ${allDecks.length} deck(s) generated successfully`);
  }

  document.getElementById('loadingBar').classList.remove('active');
  document.getElementById('generateBtn').disabled = false;
  updateBtn();
});

function renderDecks(decks) {
  const grid = document.getElementById('decksGrid');
  grid.innerHTML = '';
  decks.forEach((deck, i) => {
    const ext = deck.name.split('.').pop().toLowerCase();
    const icons = {
      pdf: '📄', jpg: '🖼️', jpeg: '🖼️',
      png: '🖼️', webp: '🖼️', txt: '📝'
    };
    const icon = icons[ext] || '📎';
    grid.innerHTML += `
      <div class="deck-card">
        <span class="deck-icon">${icon}</span>
        <div class="deck-name">${deck.name}</div>
        <div class="deck-meta">${deck.cards.length} cards generated</div>
        <button class="deck-btn" onclick="openDeck(${i})">Study Deck →</button>
      </div>`;
  });
  window.generatedDecks = decks;
  document.getElementById('exportBtn').style.display = 'block';
}

// Study screen variables
let currentDeck = [];
let currentCardIndex = 0;
let isFlipped = false;
let currentMode = 'flip';
let quizScore = 0;
let quizCardIndex = 0;

function openDeck(i) {
  currentDeck = [...window.generatedDecks[i].cards];
  currentCardIndex = 0;
  isFlipped = false;
  currentMode = 'flip';
  quizScore = 0;
  quizCardIndex = 0;

  document.getElementById('studyDeckName').textContent = window.generatedDecks[i].name;
  document.getElementById('studyScreen').style.display = 'block';
  document.getElementById('decksSection').style.display = 'none';

  switchMode('flip');
  showFlipCard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeStudy() {
  document.getElementById('studyScreen').style.display = 'none';
  document.getElementById('decksSection').style.display = 'block';
}

function updateProgress() {
  const total = currentDeck.length;
  const current = currentMode === 'flip' ? currentCardIndex + 1 : quizCardIndex + 1;
  const percent = (current / total) * 100;
  document.getElementById('progressFill').style.width = percent + '%';
  document.getElementById('progressText').textContent = `Card ${current} of ${total}`;
}

// FLIP MODE
function showFlipCard() {
  isFlipped = false;
  const card = currentDeck[currentCardIndex];
  document.getElementById('flipQuestion').textContent = card.question;
  document.getElementById('flipAnswer').textContent = card.answer;
  document.getElementById('flashcard').classList.remove('flipped');
  document.getElementById('prevBtn').disabled = currentCardIndex === 0;
  document.getElementById('nextBtn').disabled = currentCardIndex === currentDeck.length - 1;
  updateProgress();
}

function flipCard() {
  isFlipped = !isFlipped;
  document.getElementById('flashcard').classList.toggle('flipped', isFlipped);
}

function prevCard() {
  if (currentCardIndex > 0) {
    currentCardIndex--;
    showFlipCard();
  }
}

function nextCard() {
  if (currentCardIndex < currentDeck.length - 1) {
    currentCardIndex++;
    showFlipCard();
  }
}

function shuffleCards() {
  currentDeck = currentDeck.sort(() => Math.random() - 0.5);
  currentCardIndex = 0;
  showFlipCard();
}

// QUIZ MODE
function showQuizCard() {
  if (quizCardIndex >= currentDeck.length) {
    showResults();
    return;
  }

  const card = currentDeck[quizCardIndex];
  document.getElementById('quizQuestion').textContent = card.question;
  document.getElementById('quizFeedback').style.display = 'none';
  document.getElementById('quizResults').style.display = 'none';

  // Generate options — 1 correct + 3 random wrong
  const allAnswers = currentDeck.map(c => c.answer);
  const wrongAnswers = allAnswers
    .filter(a => a !== card.answer)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const options = [...wrongAnswers, card.answer].sort(() => Math.random() - 0.5);

  const optionsEl = document.getElementById('quizOptions');
  optionsEl.innerHTML = '';
  options.forEach(option => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = option;
    btn.onclick = () => selectAnswer(btn, option, card.answer);
    optionsEl.appendChild(btn);
  });

  updateProgress();
}

function selectAnswer(btn, selected, correct) {
  // Disable all options
  document.querySelectorAll('.quiz-option').forEach(b => b.onclick = null);

  const isCorrect = selected === correct;
  btn.classList.add(isCorrect ? 'correct' : 'wrong');

  if (isCorrect) {
    quizScore++;
  } else {
    // Highlight correct answer
    document.querySelectorAll('.quiz-option').forEach(b => {
      if (b.textContent === correct) b.classList.add('correct');
    });
  }

  // Show feedback
  const feedback = document.getElementById('quizFeedback');
  const feedbackText = document.getElementById('feedbackText');
  const feedbackAnswer = document.getElementById('feedbackAnswer');

  feedbackText.textContent = isCorrect ? '✅ Correct!' : '❌ Not quite';
  feedbackText.style.color = isCorrect ? '#47c98e' : '#e85447';
  feedbackAnswer.textContent = isCorrect ? 'Great job!' : `Correct answer: ${correct}`;
  feedback.style.display = 'block';
}

function nextQuizCard() {
  quizCardIndex++;
  if (quizCardIndex >= currentDeck.length) {
    showResults();
  } else {
    showQuizCard();
  }
}

function showResults() {
  document.getElementById('quizMode').style.display = 'none';
  document.getElementById('quizResults').style.display = 'block';

  const total = currentDeck.length;
  const percent = Math.round((quizScore / total) * 100);

  document.getElementById('resultsScore').textContent = `${quizScore} / ${total}`;

  let msg = '';
  if (percent === 100) msg = 'Perfect score! You nailed it! 🔥';
  else if (percent >= 75) msg = 'Great job! Almost there! 💪';
  else if (percent >= 50) msg = 'Good effort! Keep studying! 📚';
  else msg = 'Keep going — practice makes perfect! 🌱';

  document.getElementById('resultsMsg').textContent = msg;
  document.getElementById('progressFill').style.width = '100%';
  document.getElementById('progressText').textContent = `Quiz complete!`;
}

function retryQuiz() {
  quizScore = 0;
  quizCardIndex = 0;
  currentDeck = currentDeck.sort(() => Math.random() - 0.5);
  document.getElementById('quizResults').style.display = 'none';
  document.getElementById('quizMode').style.display = 'block';
  showQuizCard();
}

function switchMode(mode) {
  currentMode = mode;

  document.getElementById('flipModeBtn').classList.toggle('active', mode === 'flip');
  document.getElementById('quizModeBtn').classList.toggle('active', mode === 'quiz');

  if (mode === 'flip') {
    document.getElementById('flipMode').style.display = 'block';
    document.getElementById('quizMode').style.display = 'none';
    document.getElementById('quizResults').style.display = 'none';
    currentCardIndex = 0;
    showFlipCard();
  } else {
    document.getElementById('flipMode').style.display = 'none';
    document.getElementById('quizMode').style.display = 'block';
    document.getElementById('quizResults').style.display = 'none';
    quizCardIndex = 0;
    quizScore = 0;
    showQuizCard();
  }
}
function exportCards() {
  if (!window.generatedDecks || window.generatedDecks.length === 0) return;

  let content = '';

  window.generatedDecks.forEach(deck => {
    content += `========================================\n`;
    content += `DECK: ${deck.name}\n`;
    content += `========================================\n\n`;

    deck.cards.forEach((card, i) => {
      content += `Card ${i + 1}\n`;
      content += `Q: ${card.question}\n`;
      content += `A: ${card.answer}\n\n`;
    });

    content += '\n';
  });

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flashcards.txt';
  a.click();
  URL.revokeObjectURL(url);
}