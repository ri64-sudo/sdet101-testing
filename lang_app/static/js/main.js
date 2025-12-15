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
  // Reset password field to hidden when showing login
  const passwordInput = document.getElementById("password");
  const toggleBtn = document.getElementById("toggle-password");
  if (passwordInput) passwordInput.type = "password";
  if (toggleBtn) {
    toggleBtn.classList.remove("active");
    const icon = toggleBtn.querySelector(".toggle-icon");
    if (icon) icon.textContent = "👁️";
  }
}

function showRegister() {
  document.getElementById("welcome").style.display = "none";
  document.getElementById("login-section").style.display = "none";
  document.getElementById("register-section").style.display = "block";
  // Reset password field to hidden when showing register
  const passwordInput = document.getElementById("reg-password");
  const toggleBtn = document.getElementById("toggle-reg-password");
  if (passwordInput) passwordInput.type = "password";
  if (toggleBtn) {
    toggleBtn.classList.remove("active");
    const icon = toggleBtn.querySelector(".toggle-icon");
    if (icon) icon.textContent = "👁️";
  }
}

function showLanguageSelection() {
  document.getElementById("language-selection").style.display = "block";
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("tasks").style.display = "none";
  document.getElementById("vocab").style.display = "none";
  document.getElementById("quiz").style.display = "none";
  const assignmentsSection = document.getElementById("assignments");
  if (assignmentsSection) assignmentsSection.style.display = "none";
}

function hideLanguageSelection() {
  document.getElementById("language-selection").style.display = "none";
}

function toggleSections(authenticated, hasLanguage = false) {
  const welcomeSection = document.getElementById("welcome");
  const loginSection = document.getElementById("login-section");
  const registerSection = document.getElementById("register-section");
  const languageSection = document.getElementById("language-selection");
  const dashboardSection = document.getElementById("dashboard");
  const tasksSection = document.getElementById("tasks");
  const vocabSection = document.getElementById("vocab");
  const quizSection = document.getElementById("quiz");
  const assignmentsSection = document.getElementById("assignments");
  const logoutBtn = document.getElementById("logout-btn");

  if (authenticated) {
    welcomeSection.style.display = "none";
    loginSection.style.display = "none";
    registerSection.style.display = "none";
    
    if (!hasLanguage) {
      // Show language selection if no language is set
      showLanguageSelection();
    } else {
      // Show main app sections
      hideLanguageSelection();
      dashboardSection.style.display = "block";
      tasksSection.style.display = "block";
      vocabSection.style.display = "block";
      quizSection.style.display = "block";
      if (assignmentsSection) assignmentsSection.style.display = "block";
    }
    
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    showWelcome();
    hideLanguageSelection();
    dashboardSection.style.display = "none";
    tasksSection.style.display = "none";
    vocabSection.style.display = "none";
    quizSection.style.display = "none";
    if (assignmentsSection) assignmentsSection.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

let currentUserLanguage = null;

async function refreshAuth() {
  const statusEl = document.getElementById("auth-status");
  try {
    const data = await api("/api/me");
    if (data.authenticated) {
      statusEl.textContent = `👤 ${data.user.username}`;
      statusEl.style.background = "#c6f6d5";
      currentUserLanguage = data.user.preferred_language;
      
      // Check if user has selected a language
      const hasLanguage = !!currentUserLanguage;
      toggleSections(true, hasLanguage);
      
      if (hasLanguage) {
        // Update vocabulary form with preferred language
        updateVocabularyLanguage(currentUserLanguage);
        await Promise.all([
          loadDashboard(),
          loadTasks(),
          loadVocab(),
          loadAssignments()
        ]);
      }
    } else {
      statusEl.textContent = "Not signed in";
      statusEl.style.background = "#f0f0f0";
      toggleSections(false);
      currentUserLanguage = null;
    }
  } catch (err) {
    statusEl.textContent = "Not signed in";
    statusEl.style.background = "#f0f0f0";
    toggleSections(false);
    currentUserLanguage = null;
  }
}

async function setLanguage(languageCode) {
  const msg = document.getElementById("lang-message");
  try {
    setMessage(msg, "Setting language...", false);
    await api("/api/auth/set-language", {
      method: "POST",
      body: JSON.stringify({ language: languageCode }),
    });
    
    currentUserLanguage = languageCode;
    setMessage(msg, `✅ Language set to ${languageCode.toUpperCase()}!`, false);
    
    // Update UI
    updateVocabularyLanguage(languageCode);
    
    // Hide language selection and show main app
    setTimeout(async () => {
      hideLanguageSelection();
      toggleSections(true, true);
      await Promise.all([
        loadDashboard(),
        loadTasks(),
        loadVocab()
      ]);
    }, 1000);
  } catch (err) {
    setMessage(msg, `❌ ${err.message}`, true);
  }
}

function updateVocabularyLanguage(langCode) {
  const langInput = document.getElementById("vocab-lang");
  const langDisplay = document.getElementById("current-language-display");
  
  if (langInput) {
    langInput.value = langCode;
    langInput.placeholder = `Language: ${langCode.toUpperCase()}`;
  }
  
  if (langDisplay) {
    langDisplay.textContent = `🌍 Learning: ${langCode.toUpperCase()}`;
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
  const username = document.getElementById("reg-username").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const msg = document.getElementById("reg-message");
  
  // Clear previous messages
  setMessage(msg, "", false);
  
  if (!username || !email || !password) {
    setMessage(msg, "❌ Please fill in all fields", true);
    return;
  }

  // Basic validation
  if (username.length < 3) {
    setMessage(msg, "❌ Username must be at least 3 characters", true);
    return;
  }

  if (!email.includes("@") || !email.includes(".")) {
    setMessage(msg, "❌ Please enter a valid email address", true);
    return;
  }

  if (password.length < 6) {
    setMessage(msg, "❌ Password must be at least 6 characters", true);
    return;
  }

  try {
    setMessage(msg, "Creating account...", false);
    const response = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    
    setMessage(msg, "✅ Account created successfully! Welcome!", false);
    document.getElementById("reg-username").value = "";
    document.getElementById("reg-email").value = "";
    document.getElementById("reg-password").value = "";
    
    // Wait a moment before refreshing to show success message
    setTimeout(async () => {
      await refreshAuth();
    }, 1000);
  } catch (err) {
    console.error("Registration error:", err);
    const errorMsg = err.message || "Failed to create account. Please try again.";
    setMessage(msg, `❌ ${errorMsg}`, true);
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
  let target_language = document.getElementById("vocab-lang").value.trim().toLowerCase();
  
  // Use preferred language if no language specified
  if (!target_language && currentUserLanguage) {
    target_language = currentUserLanguage;
    document.getElementById("vocab-lang").value = target_language;
  }
  
  if (!source_word) {
    alert("Please enter a word to learn");
    return;
  }
  
  if (!target_language) {
    alert("Please select a learning language first");
    showLanguageSelection();
    return;
  }
  
  try {
    await api("/api/vocab/", {
      method: "POST",
      body: JSON.stringify({ source_word, target_language }),
    });
    document.getElementById("vocab-word").value = "";
    // Keep the language code in the input
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

// Password toggle functionality
function togglePasswordVisibility(passwordId, toggleId) {
  const passwordInput = document.getElementById(passwordId);
  const toggleButton = document.getElementById(toggleId);
  
  if (passwordInput && toggleButton) {
    const toggleIcon = toggleButton.querySelector(".toggle-icon");
    
    toggleButton.addEventListener("click", () => {
      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleButton.classList.add("active");
        toggleButton.setAttribute("aria-label", "Hide password");
        if (toggleIcon) toggleIcon.textContent = "🙈";
      } else {
        passwordInput.type = "password";
        toggleButton.classList.remove("active");
        toggleButton.setAttribute("aria-label", "Show password");
        if (toggleIcon) toggleIcon.textContent = "👁️";
      }
    });
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

// Assignment functions
let currentAssignment = null;

async function loadAssignments() {
  try {
    const assignments = await api("/api/assignments/");
    const container = document.getElementById("assignments-container");
    if (!container) return;
    
    container.innerHTML = "";
    
    if (assignments.length === 0) {
      container.innerHTML = "<p style='padding: 1rem; color: #666;'>No assignments yet. Generate one above!</p>";
      return;
    }
    
    assignments.forEach(assignment => {
      const card = document.createElement("div");
      card.className = "assignment-card";
      card.style.borderLeft = assignment.is_completed ? "4px solid #48bb78" : "4px solid #667eea";
      
      const statusBadge = assignment.is_completed 
        ? `<span class="status-badge completed">✅ Completed (${assignment.score}%)</span>`
        : `<span class="status-badge pending">📝 Pending</span>`;
      
      card.innerHTML = `
        <div class="assignment-card-header">
          <h4>${assignment.title}</h4>
          ${statusBadge}
        </div>
        <p class="assignment-meta">Type: ${assignment.type.replace('_', ' ')} | Language: ${assignment.language.toUpperCase()}</p>
        ${assignment.description ? `<p>${assignment.description}</p>` : ''}
        <div class="assignment-card-actions">
          <button class="btn btn-primary btn-small" data-assignment-id="${assignment.id}">
            ${assignment.is_completed ? 'View Results' : 'Start Assignment'}
          </button>
        </div>
      `;
      
      container.appendChild(card);
      
      // Add click handler to the button
      const viewBtn = card.querySelector('button');
      if (viewBtn) {
        viewBtn.onclick = () => viewAssignment(assignment.id);
      }
    });
  } catch (err) {
    console.error("Error loading assignments:", err);
  }
}

async function generateAssignment(type) {
  try {
    const response = await api("/api/assignments/generate", {
      method: "POST",
      body: JSON.stringify({ type, language: currentUserLanguage }),
    });
    
    currentAssignment = response;
    viewAssignment(response.id);
    await loadAssignments();
  } catch (err) {
    alert(err.message || "Failed to generate assignment");
  }
}

async function viewAssignment(assignmentId) {
  try {
    const assignment = await api(`/api/assignments/${assignmentId}`);
    currentAssignment = assignment;
    
    // Show assignment viewer
    document.getElementById("assignments-list").style.display = "none";
    document.getElementById("assignment-viewer").style.display = "block";
    
    document.getElementById("assignment-title").textContent = assignment.title;
    document.getElementById("assignment-description").textContent = assignment.description || "";
    
    const questionsDiv = document.getElementById("assignment-questions");
    questionsDiv.innerHTML = "";
    
    const questions = assignment.content.questions;
    Object.keys(questions).forEach(qId => {
      const question = questions[qId];
      const questionDiv = document.createElement("div");
      questionDiv.className = "assignment-question";
      
      if (assignment.type === "multiple_choice") {
        questionDiv.innerHTML = `
          <div class="question-label">${question.question}</div>
          <div class="options-container">
            ${question.options.map((opt, idx) => `
              <label class="option-label">
                <input type="radio" name="q${qId}" value="${idx}" ${assignment.is_completed ? 'disabled' : ''}>
                ${opt}
              </label>
            `).join('')}
          </div>
        `;
      } else {
        questionDiv.innerHTML = `
          <div class="question-label">${question.question}</div>
          <input type="text" 
                 class="input-field assignment-answer" 
                 data-question="${qId}" 
                 placeholder="Your answer"
                 ${assignment.is_completed ? 'disabled' : ''}>
        `;
      }
      
      questionsDiv.appendChild(questionDiv);
    });
    
    // Show/hide submit button based on completion
    const submitBtn = document.getElementById("submit-assignment-btn");
    if (assignment.is_completed) {
      submitBtn.style.display = "none";
      showAssignmentResults(assignment);
    } else {
      submitBtn.style.display = "inline-block";
      document.getElementById("assignment-result").innerHTML = "";
    }
  } catch (err) {
    alert(err.message || "Failed to load assignment");
  }
}

async function submitAssignment() {
  if (!currentAssignment) return;
  
  const answers = {};
  const questionInputs = document.querySelectorAll(".assignment-answer, input[type='radio']:checked");
  
  questionInputs.forEach(input => {
    const questionId = input.dataset.question || input.name.replace('q', '');
    answers[questionId] = input.value;
  });
  
  try {
    const result = await api(`/api/assignments/${currentAssignment.id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    
    showAssignmentResults({ ...currentAssignment, is_completed: true, score: result.score }, result);
    document.getElementById("submit-assignment-btn").style.display = "none";
    await loadAssignments();
  } catch (err) {
    alert(err.message || "Failed to submit assignment");
  }
}

function showAssignmentResults(assignment, result = null) {
  const resultDiv = document.getElementById("assignment-result");
  if (result) {
    resultDiv.innerHTML = `
      <div class="result-summary">
        <h3>${result.feedback}</h3>
        <p>Score: <strong>${result.score}%</strong> (${result.correct}/${result.total} correct)</p>
      </div>
    `;
    resultDiv.className = "assignment-result " + (result.score >= 70 ? "success" : "warning");
  }
}

function cancelAssignment() {
  document.getElementById("assignments-list").style.display = "block";
  document.getElementById("assignment-viewer").style.display = "none";
  currentAssignment = null;
}

// Language selection event listeners
document.querySelectorAll(".language-btn").forEach(btn => {
  btn.onclick = () => {
    const langCode = btn.getAttribute("data-lang");
    setLanguage(langCode);
  };
});

document.getElementById("custom-lang-btn").onclick = () => {
  const customLang = document.getElementById("custom-lang-code").value.trim().toLowerCase();
  if (customLang && customLang.length >= 2 && customLang.length <= 3) {
    setLanguage(customLang);
  } else {
    const msg = document.getElementById("lang-message");
    setMessage(msg, "❌ Please enter a valid 2-3 character language code", true);
  }
};

document.getElementById("change-language-btn").onclick = () => {
  showLanguageSelection();
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("tasks").style.display = "none";
  document.getElementById("vocab").style.display = "none";
  document.getElementById("quiz").style.display = "none";
  const assignmentsSection = document.getElementById("assignments");
  if (assignmentsSection) assignmentsSection.style.display = "none";
};

// Assignment event listeners
document.querySelectorAll(".assignment-type-btn").forEach(btn => {
  btn.onclick = () => {
    const type = btn.getAttribute("data-type");
    generateAssignment(type);
  };
});

document.getElementById("submit-assignment-btn").onclick = submitAssignment;
document.getElementById("cancel-assignment-btn").onclick = cancelAssignment;

// Initialize password toggles
togglePasswordVisibility("password", "toggle-password");
togglePasswordVisibility("reg-password", "toggle-reg-password");

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
