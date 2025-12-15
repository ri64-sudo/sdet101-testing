// Chart instances for dashboard
let taskChart = null;
let vocabChart = null;
let progressChart = null;

// API helper function
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

function showWelcome() {
  document.getElementById("welcome").style.display = "block";
  document.getElementById("login-section").style.display = "none";
  document.getElementById("register-section").style.display = "none";
}

function showLogin() {
  document.getElementById("welcome").style.display = "none";
  document.getElementById("login-section").style.display = "block";
  document.getElementById("register-section").style.display = "none";
}

function showRegister() {
  document.getElementById("welcome").style.display = "none";
  document.getElementById("login-section").style.display = "none";
  document.getElementById("register-section").style.display = "block";
}

function toggleSections(authenticated) {
  const welcomeSection = document.getElementById("welcome");
  const loginSection = document.getElementById("login-section");
  const registerSection = document.getElementById("register-section");
  const dashboardSection = document.getElementById("dashboard");
  const tasksSection = document.getElementById("tasks");
  const vocabSection = document.getElementById("vocab");
  const quizSection = document.getElementById("quiz");
  const logoutBtn = document.getElementById("logout-btn");

  if (authenticated) {
    welcomeSection.style.display = "none";
    loginSection.style.display = "none";
    registerSection.style.display = "none";
    dashboardSection.style.display = "block";
    tasksSection.style.display = "block";
    vocabSection.style.display = "block";
    quizSection.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    showWelcome();
    dashboardSection.style.display = "none";
    tasksSection.style.display = "none";
    vocabSection.style.display = "none";
    quizSection.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

async function refreshAuth() {
  const statusEl = document.getElementById("auth-status");
  try {
    const data = await api("/api/me");
    if (data.authenticated) {
      statusEl.textContent = `👤 ${data.user.username}`;
      statusEl.style.background = "#c6f6d5";
      toggleSections(true);
      await Promise.all([
        loadDashboard(),
        loadTasks(),
        loadVocab()
      ]);
    } else {
      statusEl.textContent = "Not signed in";
      statusEl.style.background = "#f0f0f0";
      toggleSections(false);
    }
  } catch (err) {
    statusEl.textContent = "Not signed in";
    statusEl.style.background = "#f0f0f0";
    toggleSections(false);
  }
}

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("auth-message");
  
  if (!username || !password) {
    setMessage(msg, "Please enter username and password", true);
    return;
  }

  try {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setMessage(msg, "✅ Logged in successfully!");
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    await refreshAuth();
  } catch (err) {
    setMessage(msg, err.message, true);
  }
}

async function register() {
  const username = document.getElementById("reg-username").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const msg = document.getElementById("reg-message");
  
  if (!username || !email || !password) {
    setMessage(msg, "Please fill in all fields", true);
    return;
  }

  try {
    await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    setMessage(msg, "✅ Account created successfully! Welcome!");
    document.getElementById("reg-username").value = "";
    document.getElementById("reg-email").value = "";
    document.getElementById("reg-password").value = "";
    await refreshAuth();
  } catch (err) {
    setMessage(msg, err.message, true);
  }
}

async function logout() {
  try {
    await api("/api/auth/logout", { method: "POST" });
    document.getElementById("task-list").innerHTML = "";
    document.getElementById("vocab-list").innerHTML = "";
    document.getElementById("quiz-area").innerHTML = "";
    document.getElementById("quiz-result").innerHTML = "";
    document.getElementById("upcoming-list").innerHTML = "";
    
    // Clear messages
    document.getElementById("auth-message").textContent = "";
    document.getElementById("reg-message").textContent = "";
    
    // Destroy charts
    if (taskChart) taskChart.destroy();
    if (vocabChart) vocabChart.destroy();
    if (progressChart) progressChart.destroy();
    taskChart = vocabChart = progressChart = null;
    
    await refreshAuth();
  } catch (err) {
    console.error("Logout error:", err);
  }
}

async function loadDashboard() {
  try {
    const data = await api("/api/analytics/dashboard");
    
    // Update stat cards
    document.getElementById("stat-tasks-total").textContent = data.summary.total_tasks;
    document.getElementById("stat-tasks-completed").textContent = data.summary.completed_tasks;
    document.getElementById("stat-vocab-total").textContent = data.summary.total_vocab_words;
    document.getElementById("stat-languages").textContent = data.summary.languages_studied;
    
    // Update upcoming tasks
    const upcomingList = document.getElementById("upcoming-list");
    upcomingList.innerHTML = "";
    if (data.tasks.upcoming.length === 0) {
      upcomingList.innerHTML = "<li style='padding: 1rem; color: #666;'>No upcoming tasks</li>";
    } else {
      data.tasks.upcoming.forEach(task => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${task.name}</strong> - Due: ${task.due_date}`;
        upcomingList.appendChild(li);
      });
    }
    
    // Create/update charts
    updateTaskChart(data.tasks.completion);
    updateVocabChart(data.vocabulary.by_language);
    updateProgressChart(data.tasks.created_over_time, data.vocabulary.learned_over_time);
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

function updateTaskChart(completionData) {
  const ctx = document.getElementById("task-chart");
  if (!ctx) return;
  
  if (taskChart) taskChart.destroy();
  
  taskChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Completed", "Pending"],
      datasets: [{
        data: [completionData.completed, completionData.pending],
        backgroundColor: ["#48bb78", "#ed8936"],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

function updateVocabChart(langData) {
  const ctx = document.getElementById("vocab-chart");
  if (!ctx) return;
  
  if (vocabChart) vocabChart.destroy();
  
  const languages = Object.keys(langData);
  const counts = Object.values(langData);
  
  if (languages.length === 0) {
    ctx.parentElement.innerHTML = "<p>No vocabulary data yet. Start learning!</p>";
    return;
  }
  
  vocabChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: languages,
      datasets: [{
        label: "Words Learned",
        data: counts,
        backgroundColor: "#667eea",
        borderColor: "#5568d3",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

function updateProgressChart(tasksData, vocabData) {
  const ctx = document.getElementById("progress-chart");
  if (!ctx) return;
  
  if (progressChart) progressChart.destroy();
  
  // Get all unique dates
  const allDates = new Set([
    ...Object.keys(tasksData),
    ...Object.keys(vocabData)
  ]);
  const sortedDates = Array.from(allDates).sort();
  
  const taskValues = sortedDates.map(date => tasksData[date] || 0);
  const vocabValues = sortedDates.map(date => vocabData[date] || 0);
  
  progressChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: sortedDates,
      datasets: [
        {
          label: "Tasks Created",
          data: taskValues,
          borderColor: "#667eea",
          backgroundColor: "rgba(102, 126, 234, 0.1)",
          tension: 0.4
        },
        {
          label: "Words Learned",
          data: vocabValues,
          borderColor: "#48bb78",
          backgroundColor: "rgba(72, 187, 120, 0.1)",
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      plugins: {
        legend: {
          position: "top"
        }
      }
    }
  });
}

async function loadTasks() {
  try {
    const tasks = await api("/api/tasks/");
    const ul = document.getElementById("task-list");
    ul.innerHTML = "";
    
    if (tasks.length === 0) {
      ul.innerHTML = "<li style='padding: 1rem; color: #666;'>No tasks yet. Add one above!</li>";
      return;
    }
    
    tasks.forEach((t) => {
      const li = document.createElement("li");
      if (t.is_completed) li.classList.add("completed");
      
      const taskText = document.createElement("span");
      const due = t.due_date ? ` (due ${t.due_date})` : "";
      taskText.textContent = `${t.name}${due}`;
      
      const toggle = document.createElement("button");
      toggle.className = "btn btn-secondary";
      toggle.textContent = t.is_completed ? "Mark Incomplete" : "Mark Done";
      toggle.onclick = () => updateTask(t.id, { is_completed: !t.is_completed });
      
      const del = document.createElement("button");
      del.className = "btn btn-danger";
      del.textContent = "Delete";
      del.onclick = () => deleteTask(t.id);
      
      li.appendChild(taskText);
      li.appendChild(toggle);
      li.appendChild(del);
      ul.appendChild(li);
    });
    
    // Reload dashboard to update stats
    await loadDashboard();
  } catch (err) {
    console.error(err);
  }
}

async function createTask() {
  const name = document.getElementById("task-name").value.trim();
  const due_date = document.getElementById("task-due").value || null;
  
  if (!name) {
    alert("Please enter a task name");
    return;
  }
  
  try {
    await api("/api/tasks/", {
      method: "POST",
      body: JSON.stringify({ name, due_date }),
    });
    document.getElementById("task-name").value = "";
    document.getElementById("task-due").value = "";
    await loadTasks();
  } catch (err) {
    alert(err.message);
  }
}

async function updateTask(id, payload) {
  try {
    await api(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    await loadTasks();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteTask(id) {
  if (!confirm("Are you sure you want to delete this task?")) return;
  
  try {
    await api(`/api/tasks/${id}`, { method: "DELETE" });
    await loadTasks();
  } catch (err) {
    alert(err.message);
  }
}

async function loadVocab() {
  try {
    const entries = await api("/api/vocab/");
    const ul = document.getElementById("vocab-list");
    ul.innerHTML = "";
    
    if (entries.length === 0) {
      ul.innerHTML = "<li style='padding: 1rem; color: #666;'>No vocabulary yet. Add words above!</li>";
      return;
    }
    
    entries.forEach((e) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${e.source_word}</strong> → ${e.translated_word} <span style="color: #667eea;">(${e.target_language})</span>`;
      ul.appendChild(li);
    });
    
    // Reload dashboard to update stats
    await loadDashboard();
  } catch (err) {
    console.error(err);
  }
}

async function addVocab() {
  const source_word = document.getElementById("vocab-word").value.trim();
  const target_language = document.getElementById("vocab-lang").value.trim().toLowerCase();
  
  if (!source_word || !target_language) {
    alert("Please enter both word and language code");
    return;
  }
  
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
  try {
    const res = await api("/api/vocab/quiz");
    const area = document.getElementById("quiz-area");
    const result = document.getElementById("quiz-result");
    result.textContent = "";
    area.innerHTML = "";
    
    if (!res.questions || res.questions.length === 0) {
      area.innerHTML = "<p style='padding: 1rem; color: #666;'>Add vocabulary to start a quiz.</p>";
      return;
    }

    let score = 0;
    let answered = 0;
    
    res.questions.forEach((q, index) => {
      const container = document.createElement("div");
      container.style.marginBottom = "1rem";
      
      const label = document.createElement("div");
      label.style.fontWeight = "600";
      label.style.marginBottom = "0.5rem";
      label.textContent = `Question ${index + 1}: Translate "${q.source_word}" to ${q.target_language.toUpperCase()}`;
      
      const input = document.createElement("input");
      input.className = "input-field";
      input.placeholder = "Enter translation";
      input.style.marginRight = "0.5rem";
      
      const button = document.createElement("button");
      button.className = "btn btn-primary";
      button.textContent = "Check";
      
      const feedback = document.createElement("span");
      feedback.style.marginLeft = "0.5rem";
      feedback.style.fontWeight = "600";
      
      button.onclick = () => {
        if (button.disabled) return;
        
        const userAnswer = input.value.trim().toLowerCase();
        const correctAnswer = q.answer.toLowerCase();
        
        if (userAnswer === correctAnswer) {
          feedback.textContent = "✅ Correct!";
          feedback.style.color = "#48bb78";
          score += 1;
        } else {
          feedback.textContent = `❌ Incorrect (answer: ${q.answer})`;
          feedback.style.color = "#f56565";
        }
        
        answered += 1;
        button.disabled = true;
        input.disabled = true;
        
        if (answered === res.questions.length) {
          const percentage = Math.round((score / res.questions.length) * 100);
          result.textContent = `🎉 Quiz Complete! Score: ${score} / ${res.questions.length} (${percentage}%)`;
          result.style.background = percentage >= 70 ? "#c6f6d5" : "#fed7d7";
        }
      };
      
      container.appendChild(label);
      container.appendChild(input);
      container.appendChild(button);
      container.appendChild(feedback);
      area.appendChild(container);
    });
  } catch (err) {
    alert(err.message);
  }
}

// Event listeners
document.getElementById("has-account-btn").onclick = showLogin;
document.getElementById("no-account-btn").onclick = showRegister;
document.getElementById("back-to-welcome-btn").onclick = showWelcome;
document.getElementById("back-to-welcome-reg-btn").onclick = showWelcome;
document.getElementById("login-btn").onclick = login;
document.getElementById("register-btn").onclick = register;
document.getElementById("logout-btn").onclick = logout;
document.getElementById("task-add-btn").onclick = createTask;
document.getElementById("vocab-add-btn").onclick = addVocab;
document.getElementById("quiz-start-btn").onclick = startQuiz;

// Allow Enter key to submit forms
document.getElementById("password").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    login();
  }
});

document.getElementById("reg-password").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    register();
  }
});

document.getElementById("task-name").addEventListener("keypress", (e) => {
  if (e.key === "Enter") createTask();
});

document.getElementById("vocab-word").addEventListener("keypress", (e) => {
  if (e.key === "Enter") addVocab();
});

// Initialize
refreshAuth();
