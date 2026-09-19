"use strict";

const taskForm       = document.getElementById("taskForm");
const taskTitle      = document.getElementById("taskTitle");
const taskCategory   = document.getElementById("taskCategory");
const taskList       = document.getElementById("taskList");
const emptyState     = document.getElementById("emptyState");
const clearAllBtn    = document.getElementById("clearAll");

const searchInput    = document.getElementById("searchInput");
const filterCategory = document.getElementById("filterCategory");
const filterStatus   = document.getElementById("filterStatus");

const countTotal     = document.getElementById("countTotal");
const countPending   = document.getElementById("countPending");
const countDone      = document.getElementById("countDone");

const themeToggle    = document.getElementById("themeToggle");

const STORAGE_KEY = "taskmanager.tasks";
const THEME_KEY   = "taskmanager.theme";

let idCounter = 1;

function createTaskCard(task) {
  const card = document.createElement("article");
  card.className = "task-card";

  card.setAttribute("data-id", task.id);
  card.setAttribute("data-status", task.status);      
  card.setAttribute("data-category", task.category);  

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const categoryChip = document.createElement("span");
  categoryChip.className = "chip chip-category";
  categoryChip.appendChild(document.createTextNode(task.category));

  const statusChip = document.createElement("span");
  statusChip.className = "chip chip-status";
  statusChip.appendChild(document.createTextNode(task.status));

  meta.append(categoryChip, statusChip);

  const title = document.createElement("p");
  title.className = "task-title";
  title.appendChild(document.createTextNode(task.title));

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const buttons = [
    { action: "complete", label: task.status === "complete" ? "Undo" : "Complete", cls: "btn-done" },
    { action: "edit",     label: "Edit",   cls: "btn-edit" },
    { action: "up",       label: "↑",      cls: "btn-move" },
    { action: "down",     label: "↓",      cls: "btn-move" },
    { action: "delete",   label: "Delete", cls: "btn-del"  }
  ];

  buttons.forEach(function (config) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm " + config.cls;
    btn.setAttribute("data-action", config.action);
    btn.appendChild(document.createTextNode(config.label));
    actions.append(btn);
  });

  card.append(meta, title, actions);
  return card;
}

taskForm.addEventListener("submit", function (event) {
  event.preventDefault(); 

  const titleText = taskTitle.value.trim();
  if (titleText === "") return;

  const task = {
    id: idCounter++,
    title: titleText,
    category: taskCategory.value,
    status: "pending"
  };

  const card = createTaskCard(task);

  taskList.prepend(card);

  taskForm.reset();
  taskTitle.focus();

  refreshUI();
});

taskList.addEventListener("click", function (event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;              
  if (!taskList.contains(button)) return;

  const card   = button.closest(".task-card");
  const action = button.getAttribute("data-action");

  if (action === "complete") toggleComplete(card, button);
  if (action === "edit")     startEditing(card);
  if (action === "delete")   deleteTask(card);
  if (action === "up")       moveUp(card);
  if (action === "down")     moveDown(card);
});


function toggleComplete(card, button) {
  const isDone = card.dataset.status === "complete";
  const next   = isDone ? "pending" : "complete";

  card.dataset.status = next;               
  button.textContent  = isDone ? "Complete" : "Undo";

  const statusChip = card.querySelector(".chip-status");
  statusChip.textContent = next;

  refreshUI();
}


function startEditing(card) {
  const title = card.querySelector(".task-title");
  if (!title) return;                    

  const originalText = title.textContent;

  const input = document.createElement("input");
  input.type      = "text";
  input.className = "task-edit-input";
  input.value     = originalText;            

  title.replaceWith(input);
  input.focus();
  input.select();

  function commit() {
    const text = input.value.trim() || "Untitled task";

    const newTitle = document.createElement("p");
    newTitle.className = "task-title";
    newTitle.appendChild(document.createTextNode(text));

    input.replaceWith(newTitle);           
    refreshUI();
  }

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter")  { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.value = originalText; input.blur(); }
  });
}


function deleteTask(card) {
  card.classList.add("is-removing");
  window.setTimeout(function () {
    card.remove();
    refreshUI();
  }, 180);
}


function moveUp(card) {
  const prev = card.previousElementSibling;
  if (prev) prev.before(card);
  saveTasks();
}

function moveDown(card) {
  const next = card.nextElementSibling;
  if (next) next.after(card);
  saveTasks();
}


clearAllBtn.addEventListener("click", function () {
  const cards = taskList.querySelectorAll(".task-card");
  if (cards.length === 0) return;
  if (!window.confirm("Delete all " + cards.length + " task(s)?")) return;

  cards.forEach(function (card) { card.remove(); });
  refreshUI();
});


function applyFilters() {
  const term     = searchInput.value.trim().toLowerCase();
  const category = filterCategory.value;
  const status   = filterStatus.value;

  const cards = taskList.querySelectorAll(".task-card");

  cards.forEach(function (card) {
    const titleEl = card.querySelector(".task-title, .task-edit-input");
    const text    = (titleEl ? (titleEl.textContent || titleEl.value) : "").toLowerCase();

    const matchesText     = term === "" || text.indexOf(term) !== -1;
    const matchesCategory = category === "all" || card.dataset.category === category;
    const matchesStatus   = status === "all" || card.dataset.status === status;

    const visible = matchesText && matchesCategory && matchesStatus;

    card.classList.toggle("is-hidden", !visible);
  });
}

function updateCounters() {
  const all     = taskList.querySelectorAll(".task-card");
  const done    = taskList.querySelectorAll('.task-card[data-status="complete"]');
  const pending = all.length - done.length;

  countTotal.textContent   = all.length;
  countDone.textContent    = done.length;
  countPending.textContent = pending;

  emptyState.classList.toggle("is-hidden", all.length > 0);
}

function refreshUI() {
  applyFilters();
  updateCounters();
  saveTasks();
}

searchInput.addEventListener("input", applyFilters);
filterCategory.addEventListener("change", applyFilters);
filterStatus.addEventListener("change", applyFilters);

function saveTasks() {
  const tasks = [];

  taskList.querySelectorAll(".task-card").forEach(function (card) {
    const titleEl = card.querySelector(".task-title, .task-edit-input");
    tasks.push({
      id:       Number(card.dataset.id),
      title:    titleEl ? (titleEl.textContent || titleEl.value) : "",
      category: card.dataset.category,
      status:   card.dataset.status
    });
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.warn("Could not save tasks:", err);
  }
}

function loadTasks() {
  let tasks = [];
  try {
    tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (err) {
    tasks = [];
  }
  if (!Array.isArray(tasks) || tasks.length === 0) return;

  const fragment = document.createDocumentFragment();

  tasks.forEach(function (task) {
    fragment.appendChild(createTaskCard(task));
    if (task.id >= idCounter) idCounter = task.id + 1;
  });

  taskList.append(fragment);
}


function applyTheme(theme) {
  const root = document.documentElement; 

  root.setAttribute("data-theme", theme);

  root.classList.toggle("dark-mode", theme === "dark");

  themeToggle.dataset.themeState = theme;

  themeToggle.querySelector(".theme-icon").textContent  = theme === "dark" ? "☀️" : "🌙";
  themeToggle.querySelector(".theme-label").textContent = theme === "dark" ? "Light Mode" : "Dark Mode";

  try { localStorage.setItem(THEME_KEY, theme); } catch (err) { }
}

themeToggle.addEventListener("click", function () {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (err) { }
  applyTheme(saved === "dark" ? "dark" : "light");
}



initTheme();
loadTasks();
refreshUI();