const state = {
  level: null,
  concept: null,     // concepto elegido hoy
  inClass: false,    // estamos en modo clase
  messages: []
};

const chatLog = document.getElementById("chatLog");
const levelPill = document.getElementById("levelPill");
const connPill = document.getElementById("connPill");
connPill.textContent = "Conexión: /api/chat";

const lvlButtons = {
  Beginner: document.getElementById("lvlBeginner"),
  Standard: document.getElementById("lvlStandard"),
  Advanced: document.getElementById("lvlAdvanced"),
};

//Test inicial

// ===== Test de nivel (frontend) =====
const TEST = [
  {
    id: "q1",
    title: "1) ¿Qué hace este código?",
    code: 'print("Hola")',
    options: [
      { text: "Muestra Hola por pantalla", points: 1 },
      { text: "Guarda Hola en una variable", points: 0 },
      { text: "Da error porque faltan ;", points: 0 }
    ]
  },
  {
    id: "q2",
    title: "2) Elige la forma correcta de asignar un número a x",
    options: [
      { text: "x = 3", points: 1 },
      { text: "x == 3", points: 0 },
      { text: "int x = 3", points: 0 }
    ]
  },
  {
    id: "q3",
    title: "3) ¿Qué imprime este código?",
    code: "x = 2\nx = x + 3\nprint(x)",
    options: [
      { text: "5", points: 1 },
      { text: "3", points: 0 },
      { text: "23", points: 0 }
    ]
  },
  {
    id: "q4",
    title: "4) Elige la condición correcta para comprobar si x es 10",
    options: [
      { text: "if x == 10:", points: 1 },
      { text: "if x = 10:", points: 0 },
      { text: "if (x == 10) then", points: 0 }
    ]
  },
  {
    id: "q5",
    title: "5) ¿Qué devuelve len([1,2,3])?",
    options: [
      { text: "3", points: 1 },
      { text: "2", points: 0 },
      { text: "Da error", points: 0 }
    ]
  },
  {
    id: "q6",
    title: "6) ¿Qué hace este bucle?",
    code: "for i in range(3):\n  print(i)",
    options: [
      { text: "Imprime 0, 1, 2", points: 2 },
      { text: "Imprime 1, 2, 3", points: 0 },
      { text: "Imprime 3 veces 'i'", points: 0 }
    ]
  }
];
// Más test

const testModal = document.getElementById("testModal");
const testQuestionsEl = document.getElementById("testQuestions");
const submitTestBtn = document.getElementById("submitTest");

// Construye el HTML del test
function renderTest() {
  testQuestionsEl.innerHTML = "";

  TEST.forEach((q, idx) => {
    const card = document.createElement("div");
    card.className = "qcard";

    const title = document.createElement("h4");
    title.className = "qtitle";
    title.textContent = q.title;
    card.appendChild(title);

    if (q.code) {
      const pre = document.createElement("pre");
      pre.className = "code";
      pre.textContent = q.code;
      card.appendChild(pre);
    }

    const options = document.createElement("div");
    options.className = "qoptions";

    q.options.forEach((opt, j) => {
      const label = document.createElement("label");

      const input = document.createElement("input");
      input.type = "radio";
      input.name = q.id;
      input.value = String(j);

      const span = document.createElement("span");
      span.textContent = opt.text;

      label.appendChild(input);
      label.appendChild(span);
      options.appendChild(label);
    });

    card.appendChild(options);
    testQuestionsEl.appendChild(card);
  });
}

function computeScore() {
  let score = 0;
  let answered = 0;

  for (const q of TEST) {
    const selected = document.querySelector(`input[name="${q.id}"]:checked`);
    if (!selected) continue;
    answered += 1;
    const optIndex = Number(selected.value);
    score += q.options[optIndex].points;
  }

  return { score, answered };
}

function openTest() {
  renderTest();
  if (typeof testModal.showModal === "function") testModal.showModal();
  else alert("Tu navegador no soporta <dialog>. (Chrome/Edge sí)");
}

// Rangos de decisión (ajustables)
function levelFromScore(score) {
  // Máximo posible: 1+1+1+1+1+2 = 7
  if (score <= 3) return "Beginner";
  if (score <= 5) return "Standard";
  return "Advanced";
}

function setLevel(level) {
  state.level = level;

  Object.entries(lvlButtons).forEach(([lvl, btn]) => {
    const active = lvl === level;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });

  levelPill.textContent = `Nivel: ${level ?? "—"}`;
}

function addMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `msg ${role}`;

  const roleEl = document.createElement("div");
  roleEl.className = "role";
  roleEl.textContent = role === "assistant" ? "Asistente" : "Alumno/a";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrapper.appendChild(roleEl);
  wrapper.appendChild(bubble);
  chatLog.appendChild(wrapper);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function askGPT(userText) {
  // Guardar en historial
  state.messages.push({ role: "user", content: userText });

  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      level: state.level,
      messages: state.messages
    })
  });

  if (!r.ok) {
    addMessage("assistant", "Error conectando con el servidor (/api/chat).");
    return;
  }

  const data = await r.json();
  const assistantText = data.text || "(Sin texto)";

  addMessage("assistant", assistantText);
  state.messages.push({ role: "assistant", content: assistantText });
}

// Botones de nivel
lvlButtons.Beginner.addEventListener("click", () => setLevel("Beginner"));
lvlButtons.Standard.addEventListener("click", () => setLevel("Standard"));
lvlButtons.Advanced.addEventListener("click", () => setLevel("Advanced"));

// Inicio: el “evento” se envía a GPT
document.getElementById("btnStart").addEventListener("click", async () => {
  addMessage("student", "[Pulsé Inicio]");

  if (!state.level) {
    // esto lo recordará también el system prompt, pero mejor UX
    addMessage("assistant", "Antes de empezar, marca tu nivel o haz el test de nivel.");
    return;
  }

  state.inClass = true;
  state.concept = null;

  await askGPT(
    "INICIO_DE_CLASE. Primero pregunta al alumno qué concepto de Python quiere trabajar hoy y ofrece 5 opciones."
  );
  });

// Test: de momento se lo pedimos a GPT (luego lo haremos “interno” con preguntas)
document.getElementById("btnTest").addEventListener("click", () => {
  openTest();
});
 // Nuevo listener para el test inicial
 submitTestBtn.addEventListener("click", () => {
  const { score, answered } = computeScore();

  if (answered < TEST.length) {
    addMessage("assistant", `Te faltan ${TEST.length - answered} preguntas por responder en el test.`);
    return;
  }

  const level = levelFromScore(score);
  setLevel(level);

  // Cerrar modal
  testModal.close();

  addMessage("assistant", `Resultado del test: ${score}/7 → tu nivel es ${level}.`);
  addMessage("assistant", `Pulsa Inicio para empezar y dime qué concepto quieres trabajar hoy.`);
});

// Chips (igual que antes)
document.getElementById("conceptChips").addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  document.getElementById("studentInput").value = btn.dataset.concept;
  document.getElementById("studentInput").focus();
});

// Enviar respuesta alumno
document.getElementById("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("studentInput");
  const text = input.value.trim();
  if (!text) return;

  addMessage("student", text);
  input.value = "";

  // Si no hay nivel, GPT recordará que seleccione (por system prompt)// Si estamos en clase y aún no hay concepto, tratamos este mensaje como "concepto del día"
if (state.inClass && !state.concept) {
  state.concept = text.toLowerCase();
  addMessage("assistant", `Concepto de hoy: ${state.concept}.`);
  await askGPT(
    `CONCEPTO_ELEGIDO: ${state.concept}. Empieza con un mini-reto adaptado al nivel.`
  );
  return;
}
  await askGPT(text);
});
document.getElementById("btnReset").addEventListener("click", async () => {
  // Mantener nivel (más práctico), pero reiniciar sesión
  state.inClass = false;
  state.concept = null;

  // Limpiar contexto de conversación con GPT
  state.messages = [];

  addMessage("assistant", "Sesión reiniciada. Pulsa Inicio para comenzar de nuevo.");

  // Opcional: avisar al GPT (no es estrictamente necesario porque borramos messages)
  // await askGPT("RESET_SESION: empieza desde cero. Pide que pulse Inicio.");
});document.getElementById("btnReset").addEventListener("click", () => {
  // Borrar TODO el estado
  state.level = null;
  state.inClass = false;
  state.concept = null;
  state.messages = [];

  // Desmarcar botones de nivel
  setLevel(null);

  // Mensaje claro al alumno
  addMessage(
    "assistant",
    "Sesión reiniciada por completo. Marca tu nivel o haz el test y pulsa Inicio para comenzar."
  );
});

