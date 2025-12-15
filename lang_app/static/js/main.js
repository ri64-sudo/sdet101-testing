async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json().catch(() => ({}));
}

function setMessage(el, text, isError = false) {
  el.textContent = text;
  el.className = isError ? "message error" : "message";
}

async function refreshAuth() {
  const statusEl = document.getElementById("auth-status");
  try {
    const data = await api("/api/me");
    if (data.authenticated) {
      statusEl.textContent = `Signed in as ${data.user.username}`;
      await Promise.all([loadTasks(), loadVocab()]);
    } else {
      statusEl.textContent = "Not signed in";
    }
  } catch (err) {
    statusEl.textContent = "Not signed in";
  }
}

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("auth-message");
  try {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setMessage(msg, "Logged in");
    await refreshAuth();
  } catch (err) {
    setMessage(msg, err.message, true);
  }
}

async function register() {
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("auth-message");
  try {
    await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    setMessage(msg, "Registered and logged in");
    await refreshAuth();
  } catch (err) {
    setMessage(msg, err.message, true);
  }
}

async function logout() {
  const msg = document.getElementById("auth-message");
  try {
    await api("/api/auth/logout", { method: "POST" });
    setMessage(msg, "Logged out");
    document.getElementById("task-list").innerHTML = "";
    document.getElementById("vocab-list").innerHTML = "";
    document.getElementById("quiz-area").innerHTML = "";
    document.getElementById("quiz-result").innerHTML = "";
    await refreshAuth();
  } catch (err) {
    setMessage(msg, err.message, true);
  }
}

async function loadTasks() {
  try {
    const tasks = await api("/api/tasks/");
    const ul = document.getElementById("task-list");
    ul.innerHTML = "";
    tasks.forEach((t) => {
      const li = document.createElement("li");
      const due = t.due_date ? ` (due ${t.due_date})` : "";
      li.textContent = `${t.name}${due}`;
      const toggle = document.createElement("button");
      toggle.textContent = t.is_completed ? "Mark Incomplete" : "Mark Done";
      toggle.onclick = () => updateTask(t.id, { is_completed: !t.is_completed });
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = () => deleteTask(t.id);
      li.append(" ", toggle, " ", del);
      ul.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

async function createTask() {
  const name = document.getElementById("task-name").value;
  const due_date = document.getElementById("task-due").value || null;
  await api("/api/tasks/", {
    method: "POST",
    body: JSON.stringify({ name, due_date }),
  });
  document.getElementById("task-name").value = "";
  document.getElementById("task-due").value = "";
  await loadTasks();
}

async function updateTask(id, payload) {
  await api(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  await loadTasks();
}

async function deleteTask(id) {
  await api(`/api/tasks/${id}`, { method: "DELETE" });
  await loadTasks();
}

async function loadVocab() {
  try {
    const entries = await api("/api/vocab/");
    const ul = document.getElementById("vocab-list");
    ul.innerHTML = "";
    entries.forEach((e) => {
      const li = document.createElement("li");
      li.textContent = `${e.source_word} → ${e.translated_word} (${e.target_language})`;
      ul.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

async function addVocab() {
  const source_word = document.getElementById("vocab-word").value;
  const target_language = document.getElementById("vocab-lang").value;
  try {
    await api("/api/vocab/", {
      method: "POST",
      body: JSON.stringify({ source_word, target_language }),
    });
    document.getElementById("vocab-word").value = "";
    document.getElementById("vocab-lang").value = "";
    await loadVocab();
  } catch (err) {
    alert(err.message);
  }
}

async function startQuiz() {
  const res = await api("/api/vocab/quiz");
  const area = document.getElementById("quiz-area");
  const result = document.getElementById("quiz-result");
  result.textContent = "";
  area.innerHTML = "";
  if (!res.questions || res.questions.length === 0) {
    area.textContent = "Add vocabulary to start a quiz.";
    return;
  }

  let score = 0;
  res.questions.forEach((q) => {
    const container = document.createElement("div");
    const label = document.createElement("div");
    label.textContent = `${q.source_word} (${q.target_language})`;
    const input = document.createElement("input");
    input.placeholder = "Translation";
    const feedback = document.createElement("span");
    const button = document.createElement("button");
    button.textContent = "Check";
    button.onclick = () => {
      if (input.value.trim().toLowerCase() === q.answer.toLowerCase()) {
        feedback.textContent = "Correct!";
        score += 1;
      } else {
        feedback.textContent = `Incorrect (answer: ${q.answer})`;
      }
      result.textContent = `Score: ${score} / ${res.questions.length}`;
      button.disabled = true;
    };
    container.append(label, input, button, feedback);
    area.appendChild(container);
  });
}

document.getElementById("login-btn").onclick = login;
document.getElementById("register-btn").onclick = register;
document.getElementById("logout-btn").onclick = logout;
document.getElementById("task-add-btn").onclick = createTask;
document.getElementById("vocab-add-btn").onclick = addVocab;
document.getElementById("quiz-start-btn").onclick = startQuiz;

refreshAuth();

