/* =============================================================================
   Personal Dashboard — js/script.js
   Sections:
     1. Config  (key constants, defaults)
     2. Storage helpers  (get / set wrappers, storage warning banner)
     3. Utility  (generateId)
     4. Widget modules  (stubs — filled in by subsequent tasks)
     5. App init  (initAll wired to DOMContentLoaded)
   ============================================================================= */

/* -----------------------------------------------------------------------------
   1. CONFIG
   ----------------------------------------------------------------------------- */

const PD_TODOS = "pd_todos";
const PD_BOOKMARKS = "pd_bookmarks";
const PD_NOTES = "pd_notes";
const PD_WEATHER_CITY = "pd_weather_city";
const PD_WEATHER_UNIT = "pd_weather_unit";
const PD_VISIBILITY = "pd_visibility";
const PD_THEME = "pd_theme"; // "dark" | "light"
const PD_USER_NAME = "pd_user_name"; // string — user's display name
const PD_TIMER_MINS = "pd_timer_mins"; // number — custom timer duration in minutes

/* -----------------------------------------------------------------------------
   2. STORAGE HELPERS
   ----------------------------------------------------------------------------- */

/**
 * Renders a dismissible warning banner at the top of the page.
 * Debounced so it only fires once per session — subsequent calls are no-ops.
 */
const showStorageWarning = (() => {
  let shown = false;

  return function () {
    if (shown) return;
    shown = true;

    const banner = document.createElement("div");
    banner.id = "storage-warning";
    banner.setAttribute("role", "alert");
    banner.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "z-index:9999",
      "background:#b91c1c",
      "color:#fff",
      "padding:0.6rem 1rem",
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "font-size:0.9rem",
      "gap:1rem",
    ].join(";");

    const msg = document.createElement("span");
    msg.textContent =
      "Storage is unavailable. Your data will not be saved this session.";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.setAttribute("aria-label", "Dismiss storage warning");
    closeBtn.style.cssText =
      "background:none;border:none;color:#fff;cursor:pointer;font-size:1rem;padding:0;";
    closeBtn.addEventListener("click", () => banner.remove());

    banner.appendChild(msg);
    banner.appendChild(closeBtn);
    document.body.prepend(banner);
  };
})();

/**
 * Thin wrapper around localStorage.
 * All reads/writes are JSON-serialised. Errors surface the storage warning
 * banner and fall back gracefully so in-memory state is never corrupted.
 */
const Storage = {
  /**
   * @param {string} key
   * @param {*} [fallback=null]
   * @returns {*}
   */
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      showStorageWarning();
      return fallback;
    }
  },

  /**
   * @param {string} key
   * @param {*} value  — must be JSON-serialisable
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      showStorageWarning();
    }
  },
};

/* -----------------------------------------------------------------------------
   3. UTILITY
   ----------------------------------------------------------------------------- */

/**
 * Generates a short, collision-resistant unique ID.
 * Uses base-36 encoding of the current timestamp combined with random bits.
 * @returns {string}
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/* -----------------------------------------------------------------------------
   4. WIDGET MODULES  (stubs — implementations added in subsequent tasks)
   ----------------------------------------------------------------------------- */

/** Initialises the Greeting / Clock widget. */
function initClock() {
  tickClock();
  setInterval(tickClock, 1000);
}

/**
 * Reads the current local time, updates #clock-time, #clock-date, and
 * #clock-greeting every time it is called.
 */
function tickClock() {
  const now = new Date();
  const hour = now.getHours();
  const min = now.getMinutes();
  const sec = now.getSeconds();

  // HH:MM:SS — zero-padded
  const timeStr = [
    String(hour).padStart(2, "0"),
    String(min).padStart(2, "0"),
    String(sec).padStart(2, "0"),
  ].join(":");

  // "Weekday, Month Day" — e.g. "Monday, January 1"
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Greeting based on local hour
  let greetingBase;
  if (hour >= 5 && hour <= 11) {
    greetingBase = "Good morning";
  } else if (hour >= 12 && hour <= 17) {
    greetingBase = "Good afternoon";
  } else {
    greetingBase = "Good evening";
  }

  // Append name if one is saved
  const savedName = Storage.get(PD_USER_NAME, "");
  const greeting = savedName ? greetingBase + ", " + savedName : greetingBase;

  document.getElementById("clock-time").textContent = timeStr;
  document.getElementById("clock-date").textContent = dateStr;
  document.getElementById("clock-greeting").textContent = greeting;
}

/** Initialises the Focus Timer widget. */
function initTimer() {
  // --- 4.1: Internal state ---
  // Load saved duration (minutes), default 25. Convert to seconds.
  const savedMins = Storage.get(PD_TIMER_MINS, 25);
  let baseDuration = Math.max(1, Math.min(120, Number(savedMins) || 25)) * 60;
  let remaining = baseDuration;
  let intervalId = null; // null when stopped, numeric ID when running

  // Sync the duration input to the saved value
  const durationInput = document.getElementById("timer-duration-input");
  durationInput.value = baseDuration / 60;

  // --- 4.1: renderTimer ---
  /**
   * Formats `remaining` as MM:SS and writes it to #timer-display.
   */
  function renderTimer() {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    document.getElementById("timer-display").textContent =
      String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  }

  // --- 4.2: startTimer ---
  /**
   * Starts the countdown only if it is not already running.
   * Decrements `remaining` each second, re-renders, and auto-stops at 0.
   */
  function startTimer() {
    if (intervalId !== null) return; // already running — no-op

    intervalId = setInterval(function () {
      remaining -= 1;
      renderTimer();

      if (remaining <= 0) {
        clearInterval(intervalId);
        intervalId = null;
        // Visual signal: add .timer--done to the widget container
        const widget = document.getElementById("widget-timer");
        if (widget) widget.classList.add("timer--done");
      }
    }, 1000);
  }

  // --- 4.3: stopTimer ---
  /**
   * Pauses the countdown, preserving the current `remaining` value.
   */
  function stopTimer() {
    if (intervalId === null) return; // already stopped — no-op
    clearInterval(intervalId);
    intervalId = null;
  }

  // --- 4.3: resetTimer ---
  /**
   * Stops any active countdown, resets `remaining` to baseDuration, and re-renders.
   * Also removes the .timer--done visual signal if present.
   */
  function resetTimer() {
    clearInterval(intervalId);
    intervalId = null;
    remaining = baseDuration;
    const widget = document.getElementById("widget-timer");
    if (widget) widget.classList.remove("timer--done");
    renderTimer();
  }

  /**
   * Applies a new duration from the input field.
   * Stops any running timer, saves the preference, and resets to the new duration.
   */
  function setDuration() {
    const raw = parseInt(durationInput.value, 10);
    const mins = isNaN(raw) ? 25 : Math.max(1, Math.min(120, raw));
    durationInput.value = mins; // clamp displayed value
    baseDuration = mins * 60;
    Storage.set(PD_TIMER_MINS, mins);
    resetTimer(); // reset to new duration immediately
  }

  // --- 4.3: Wire button click handlers ---
  document
    .getElementById("timer-start-btn")
    .addEventListener("click", startTimer);
  document
    .getElementById("timer-stop-btn")
    .addEventListener("click", stopTimer);
  document
    .getElementById("timer-reset-btn")
    .addEventListener("click", resetTimer);
  document
    .getElementById("timer-set-btn")
    .addEventListener("click", setDuration);

  // Also apply on Enter inside the duration input
  durationInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      setDuration();
    }
  });

  // Render the initial display
  renderTimer();
}

/** Initialises the To-Do List widget. */
function initTodos() {
  // --- 6.1: Internal state ---
  let tasks = Storage.get(PD_TODOS, []);

  // --- 6.1: renderTodos ---
  /**
   * Clears #todo-list and rebuilds it from the current tasks array.
   * Each <li> contains: checkbox, title span, edit button, delete button.
   */
  function renderTodos() {
    const list = document.getElementById("todo-list");
    list.innerHTML = "";

    tasks.forEach(function (task) {
      const li = document.createElement("li");

      // Checkbox — toggle done state
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.done;
      checkbox.setAttribute("data-id", task.id);
      checkbox.setAttribute("data-action", "toggle");
      checkbox.setAttribute(
        "aria-label",
        'Mark "' +
          task.title +
          '" as ' +
          (task.done ? "incomplete" : "complete"),
      );

      // Title span — strikethrough when done
      const span = document.createElement("span");
      span.textContent = task.title;
      span.className = "todo-title" + (task.done ? " todo-title--done" : "");
      span.setAttribute("data-id", task.id);

      // Edit button
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "btn btn--icon";
      editBtn.setAttribute("data-id", task.id);
      editBtn.setAttribute("data-action", "edit");
      editBtn.setAttribute("aria-label", "Edit task: " + task.title);

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "✕";
      deleteBtn.className = "btn btn--danger";
      deleteBtn.setAttribute("data-id", task.id);
      deleteBtn.setAttribute("data-action", "delete");
      deleteBtn.setAttribute("aria-label", "Delete task: " + task.title);

      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  }

  // --- 6.2: addTodo ---
  /**
   * Validates title, creates a new task, persists, and re-renders.
   * @param {string} title
   */
  function addTodo(title) {
    const trimmed = title.trim();
    if (!trimmed) return; // empty — do nothing (input cleared by caller)

    const task = { id: generateId(), title: trimmed, done: false };
    tasks.push(task);
    Storage.set(PD_TODOS, tasks);
    renderTodos();
  }

  // --- 6.3: toggleTodo ---
  /**
   * Flips the done state of the task with the given id, persists, re-renders.
   * @param {string} id
   */
  function toggleTodo(id) {
    const task = tasks.find(function (t) {
      return t.id === id;
    });
    if (!task) return;
    task.done = !task.done;
    Storage.set(PD_TODOS, tasks);
    renderTodos();
  }

  // --- 6.4: startInlineEdit ---
  /**
   * Replaces the title <span> with an <input> pre-filled with the current title.
   * On blur or Enter: save if non-empty, restore original if empty.
   * @param {string} id
   * @param {HTMLElement} li  — the parent <li> element
   */
  function startInlineEdit(id, li) {
    const task = tasks.find(function (t) {
      return t.id === id;
    });
    if (!task) return;

    const span = li.querySelector("span.todo-title");
    if (!span) return;

    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.value = task.title;
    editInput.className = "text-input todo-edit-input";
    editInput.setAttribute("aria-label", "Edit task title");

    // Replace span with input
    li.replaceChild(editInput, span);
    editInput.focus();
    editInput.select();

    let committed = false;

    function commitEdit() {
      if (committed) return;
      committed = true;

      const newTitle = editInput.value.trim();
      if (newTitle) {
        task.title = newTitle;
        Storage.set(PD_TODOS, tasks);
      }
      // Re-render regardless (restores span; if empty, original title is kept)
      renderTodos();
    }

    editInput.addEventListener("blur", commitEdit);
    editInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit();
      } else if (e.key === "Escape") {
        committed = true; // skip save
        renderTodos(); // restore original
      }
    });
  }

  // --- 6.5: deleteTodo ---
  /**
   * Removes the task with the given id, persists, re-renders.
   * @param {string} id
   */
  function deleteTodo(id) {
    tasks = tasks.filter(function (t) {
      return t.id !== id;
    });
    Storage.set(PD_TODOS, tasks);
    renderTodos();
  }

  // --- 6.5: Event delegation on #todo-list ---
  document.getElementById("todo-list").addEventListener("click", function (e) {
    const target = e.target;
    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");
    if (!action || !id) return;

    if (action === "toggle") {
      toggleTodo(id);
    } else if (action === "edit") {
      const li = target.closest("li");
      if (li) startInlineEdit(id, li);
    } else if (action === "delete") {
      deleteTodo(id);
    }
  });

  // --- 6.2: Wire #todo-add-btn click and Enter on #todo-input ---
  const todoInput = document.getElementById("todo-input");
  const todoAddBtn = document.getElementById("todo-add-btn");

  todoAddBtn.addEventListener("click", function () {
    addTodo(todoInput.value);
    todoInput.value = "";
    todoInput.focus();
  });

  todoInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTodo(todoInput.value);
      todoInput.value = "";
    }
  });

  // --- 6.1: Initial render ---
  renderTodos();
}

/** Initialises the Quick Links (Bookmarks) widget. */
function initBookmarks() {
  // --- 7.1: Internal state ---
  let bookmarks = Storage.get(PD_BOOKMARKS, []);

  // --- 7.1: renderBookmarks ---
  /**
   * Clears #bookmark-list and rebuilds it from the current bookmarks array.
   * Each <li> contains an <a> link (opens in new tab) and a delete button.
   * @param {Array<{id: string, label: string, url: string}>} items
   */
  function renderBookmarks(items) {
    const list = document.getElementById("bookmark-list");
    list.innerHTML = "";

    items.forEach(function (bookmark) {
      const li = document.createElement("li");

      // Link — styled as a card/button, opens in new tab
      const a = document.createElement("a");
      a.href = bookmark.url;
      a.textContent = bookmark.label;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = "bookmark-link";
      a.setAttribute("aria-label", "Open " + bookmark.label + " in a new tab");

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "✕";
      deleteBtn.className = "btn btn--danger";
      deleteBtn.setAttribute("data-id", bookmark.id);
      deleteBtn.setAttribute("data-action", "delete");
      deleteBtn.setAttribute("aria-label", "Delete link: " + bookmark.label);

      li.appendChild(a);
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  }

  // --- 7.2: addBookmark ---
  /**
   * Validates both fields, creates a new bookmark, persists, and re-renders.
   * @param {string} label
   * @param {string} url
   */
  function addBookmark(label, url) {
    const trimmedLabel = label.trim();
    const trimmedUrl = url.trim();
    if (!trimmedLabel || !trimmedUrl) return; // either field empty — do nothing

    const bookmark = { id: generateId(), label: trimmedLabel, url: trimmedUrl };
    bookmarks.push(bookmark);
    Storage.set(PD_BOOKMARKS, bookmarks);
    renderBookmarks(bookmarks);
  }

  // --- 7.3: deleteBookmark ---
  /**
   * Removes the bookmark with the given id, persists, and re-renders.
   * @param {string} id
   */
  function deleteBookmark(id) {
    bookmarks = bookmarks.filter(function (b) {
      return b.id !== id;
    });
    Storage.set(PD_BOOKMARKS, bookmarks);
    renderBookmarks(bookmarks);
  }

  // --- 7.3: Event delegation on #bookmark-list ---
  document
    .getElementById("bookmark-list")
    .addEventListener("click", function (e) {
      const target = e.target;
      const action = target.getAttribute("data-action");
      const id = target.getAttribute("data-id");
      if (action === "delete" && id) {
        deleteBookmark(id);
      }
    });

  // --- 7.2: Wire #bookmark-add-btn click ---
  const labelInput = document.getElementById("bookmark-label-input");
  const urlInput = document.getElementById("bookmark-url-input");
  const bookmarkAddBtn = document.getElementById("bookmark-add-btn");

  bookmarkAddBtn.addEventListener("click", function () {
    const label = labelInput.value;
    const url = urlInput.value;
    addBookmark(label, url);
    // Clear inputs only when both fields were non-empty (bookmark was added)
    if (label.trim() && url.trim()) {
      labelInput.value = "";
      urlInput.value = "";
      labelInput.focus();
    }
  });

  // --- 7.1: Initial render ---
  renderBookmarks(bookmarks);
}

/* -----------------------------------------------------------------------------
   5. THEME MODULE
   ----------------------------------------------------------------------------- */

/**
 * Initialises light/dark theme toggle.
 * Applies the saved theme on load and wires the toggle button.
 */
function initTheme() {
  const btn = document.getElementById("theme-toggle-btn");

  /** Apply a theme by setting data-theme on <html> and updating the button icon. */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    // Moon = dark mode available, Sun = light mode available
    btn.textContent = theme === "light" ? "\u2600" : "\u263E"; // ☀ / ☾
    btn.setAttribute(
      "aria-label",
      theme === "light" ? "Switch to dark mode" : "Switch to light mode",
    );
  }

  // Load saved preference, default to dark
  const saved = Storage.get(PD_THEME, "dark");
  applyTheme(saved);

  btn.addEventListener("click", function () {
    const current =
      document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    Storage.set(PD_THEME, next);
    applyTheme(next);
  });
}

/* -----------------------------------------------------------------------------
   6. USER NAME MODULE
   ----------------------------------------------------------------------------- */

/**
 * Initialises the custom name preference in the settings panel.
 * Saves the name to localStorage and triggers a clock re-render immediately.
 */
function initUserName() {
  const nameInput = document.getElementById("user-name-input");
  const nameSaveBtn = document.getElementById("user-name-save-btn");

  // Pre-fill with saved name
  const saved = Storage.get(PD_USER_NAME, "");
  if (saved) nameInput.value = saved;

  function saveName() {
    const name = nameInput.value.trim();
    Storage.set(PD_USER_NAME, name);
    tickClock();

    // ✅ Tambahkan feedback
    nameSaveBtn.textContent = "Saved!";
    setTimeout(() => {
      nameSaveBtn.textContent = "Save";
    }, 1500);
  }

  nameSaveBtn.addEventListener("click", saveName);
  nameInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveName();
    }
  });
}

/* -----------------------------------------------------------------------------
   7. SETTINGS MODULE
   ----------------------------------------------------------------------------- */

/**
 * Initialises the settings panel: open/close toggle and widget visibility
 * checkboxes. Visibility state is persisted to localStorage under PD_VISIBILITY.
 */
function initSettings() {
  const settingsBtn = document.getElementById("settings-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const settingsClose = document.getElementById("settings-close-btn");

  // Default: all widgets visible
  const DEFAULT_VISIBILITY = {
    clock: true,
    timer: true,
    todos: true,
    bookmarks: true,
  };

  // Load persisted visibility map (merge with defaults to handle new keys)
  let visibility = Object.assign(
    {},
    DEFAULT_VISIBILITY,
    Storage.get(PD_VISIBILITY, {}),
  );

  /** Apply visibility map to widget DOM elements. */
  function applyVisibility() {
    Object.keys(visibility).forEach(function (key) {
      const widget = document.getElementById("widget-" + key);
      if (!widget) return;
      if (visibility[key]) {
        widget.classList.remove("widget--hidden");
      } else {
        widget.classList.add("widget--hidden");
      }
    });
  }

  /** Sync checkbox states to match the current visibility map. */
  function syncCheckboxes() {
    const checkboxes = settingsPanel.querySelectorAll(
      'input[type="checkbox"][data-widget]',
    );
    checkboxes.forEach(function (cb) {
      const key = cb.getAttribute("data-widget");
      if (key in visibility) {
        cb.checked = visibility[key];
      }
    });
  }

  // Open settings panel
  settingsBtn.addEventListener("click", function () {
    settingsPanel.classList.remove("settings-panel--hidden");
    settingsPanel.setAttribute("aria-hidden", "false");
    settingsClose.focus();
  });

  // Close settings panel
  settingsClose.addEventListener("click", function () {
    settingsPanel.classList.add("settings-panel--hidden");
    settingsPanel.setAttribute("aria-hidden", "true");
    settingsBtn.focus();
  });

  // Delegated change handler for visibility checkboxes
  settingsPanel.addEventListener("change", function (e) {
    const target = e.target;
    if (target.type !== "checkbox" || !target.hasAttribute("data-widget"))
      return;
    const key = target.getAttribute("data-widget");
    visibility[key] = target.checked;
    Storage.set(PD_VISIBILITY, visibility);
    applyVisibility();
  });

  // Apply saved visibility on load and sync checkboxes
  applyVisibility();
  syncCheckboxes();
}

/* -----------------------------------------------------------------------------
   8. APP INIT
   ----------------------------------------------------------------------------- */

/**
 * Entry point — called once the DOM is fully parsed.
 * Initialises every widget in order.
 */
function initAll() {
  initTheme(); // apply theme before anything renders
  initUserName(); // load saved name (used by tickClock)
  initClock();
  initTimer();
  initTodos();
  initBookmarks();
  initSettings();
}

document.addEventListener("DOMContentLoaded", initAll);
