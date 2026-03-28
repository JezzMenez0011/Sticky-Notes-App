(() => {
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const state = {
    zoom: 1,
    minZoom: 0.4,
    maxZoom: 2.5,
    panX: 0,
    panY: 0,
    draggingBoard: false,
    boardStart: { x: 0, y: 0, panX: 0, panY: 0 },
    activeDrag: null,
    notes: new Map(),
    saveTimer: null,
    initialized: false
  };

  const els = () => ({
    board: document.getElementById("board"),
    app: document.getElementById("app"),
    welcomeScreen: document.getElementById("welcomeScreen"),
    enterBtn: document.getElementById("enterBtn"),
    addBtn: document.getElementById("addBtn"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    colorPicker: document.getElementById("colorPicker")
  });

  const STORAGE_KEY = "sticky_board_v2";

  const getPoint = (e) => {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const scheduleSave = () => {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(save, 120);
  };

  const serialize = () => {
    const notes = [];
    for (const [id, note] of state.notes.entries()) {
      const textarea = note.querySelector("textarea");
      notes.push({
        id,
        text: textarea ? textarea.value : "",
        x: parseFloat(note.dataset.x || "0"),
        y: parseFloat(note.dataset.y || "0"),
        color: note.dataset.color || "#fff7cc",
        pinned: note.dataset.pinned === "1",
        z: parseInt(note.dataset.z || "0", 10) || 0
      });
    }
    return {
      v: 2,
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
      notes
    };
  };

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()));
    } catch (_) {}
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  };

  const ensureBoard = () => {
    const { board } = els();
    if (!board) return null;
    board.style.transformOrigin = "0 0";
    board.style.touchAction = "none";
    board.style.userSelect = "none";
    return board;
  };

  const applyTransform = () => {
    const board = ensureBoard();
    if (!board) return;
    board.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  };

  const bumpZ = (note) => {
    note.dataset.z = String(Date.now());
    note.style.zIndex = note.dataset.z;
  };

  const worldFromClient = (clientX, clientY) => {
    return {
      x: (clientX - state.panX) / state.zoom,
      y: (clientY - state.panY) / state.zoom
    };
  };

  const setZoomAt = (nextZoom, clientX, clientY) => {
    const z = clamp(nextZoom, state.minZoom, state.maxZoom);
    const before = worldFromClient(clientX, clientY);
    state.zoom = z;
    const afterClientX = before.x * state.zoom + state.panX;
    const afterClientY = before.y * state.zoom + state.panY;
    state.panX += clientX - afterClientX;
    state.panY += clientY - afterClientY;
    applyTransform();
    scheduleSave();
  };

  const setZoom = (value) => {
    const p = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    setZoomAt(value, p.x, p.y);
  };

  const zoomIn = () => setZoom(state.zoom + 0.1);
  const zoomOut = () => setZoom(state.zoom - 0.1);

  const enterBoard = () => {
    const { welcomeScreen, app } = els();
    if (!welcomeScreen || !app) return;
    welcomeScreen.classList.add("fade-out");
    setTimeout(() => {
      welcomeScreen.style.display = "none";
      app.classList.remove("hidden");
    }, 420);
  };

  const setNotePos = (note, x, y) => {
    note.dataset.x = String(x);
    note.dataset.y = String(y);
    note.style.left = `${x}px`;
    note.style.top = `${y}px`;
  };

  const setPinned = (note, pinned) => {
    note.dataset.pinned = pinned ? "1" : "0";
    const pinBtn = note.querySelector(".pin-btn");
    if (pinBtn) pinBtn.textContent = pinned ? "Unpin" : "Pin";
    note.classList.toggle("pinned", pinned);
  };

  const createNoteElement = ({ id, x, y, color, text, pinned, z }) => {
    const note = document.createElement("div");
    note.className = "note";
    note.dataset.noteId = id;
    note.dataset.color = color || "#fff7cc";
    note.style.background = note.dataset.color;
    note.style.zIndex = String(z || Date.now());
    note.dataset.z = note.style.zIndex;

    const pin = document.createElement("button");
    pin.className = "pin-btn";
    pin.type = "button";

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.type = "button";
    del.textContent = "Delete";

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Write something...";
    textarea.value = text || "";

    pin.addEventListener("click", (e) => {
      e.stopPropagation();
      setPinned(note, !(note.dataset.pinned === "1"));
      bumpZ(note);
      scheduleSave();
    });

    del.addEventListener("click", (e) => {
      e.stopPropagation();
      state.notes.delete(id);
      note.remove();
      scheduleSave();
    });

    textarea.addEventListener("input", () => scheduleSave());

    note.appendChild(pin);
    note.appendChild(del);
    note.appendChild(textarea);

    setNotePos(note, x ?? 20, y ?? 80);
    setPinned(note, !!pinned);

    makeDraggable(note);
    return note;
  };

  const addNote = (opts = {}) => {
    const { board, colorPicker } = els();
    if (!board) return;
    const id = opts.id || (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + String(Math.random()).slice(2));
    const note = createNoteElement({
      id,
      x: opts.x ?? 20,
      y: opts.y ?? 80,
      color: opts.color || (colorPicker ? colorPicker.value : "#fff7cc"),
      text: opts.text || "",
      pinned: opts.pinned || false,
      z: opts.z || Date.now()
    });
    board.appendChild(note);
    state.notes.set(id, note);
    bumpZ(note);
    scheduleSave();
    const textarea = note.querySelector("textarea");
    if (textarea) textarea.focus();
  };

  const makeDraggable = (note) => {
    const onDown = (e) => {
      const target = e.target;
      if (target && (target.tagName === "TEXTAREA" || target.classList.contains("delete-btn") || target.classList.contains("pin-btn"))) return;
      if (note.dataset.pinned === "1") return;
      const p = getPoint(e);
      bumpZ(note);
      state.activeDrag = {
        note,
        startClientX: p.x,
        startClientY: p.y,
        startX: parseFloat(note.dataset.x || "0"),
        startY: parseFloat(note.dataset.y || "0")
      };
      note.style.cursor = "grabbing";
      e.preventDefault?.();
    };

    const onMove = (e) => {
      if (!state.activeDrag || state.activeDrag.note !== note) return;
      const p = getPoint(e);
      const dx = (p.x - state.activeDrag.startClientX) / state.zoom;
      const dy = (p.y - state.activeDrag.startClientY) / state.zoom;
      setNotePos(note, state.activeDrag.startX + dx, state.activeDrag.startY + dy);
      scheduleSave();
      e.preventDefault?.();
    };

    const onUp = () => {
      if (!state.activeDrag || state.activeDrag.note !== note) return;
      state.activeDrag = null;
      note.style.cursor = "grab";
      scheduleSave();
    };

    note.style.cursor = "grab";
    note.addEventListener("mousedown", onDown, { passive: false });
    note.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp, { passive: true });
    window.addEventListener("touchend", onUp, { passive: true });
    window.addEventListener("touchcancel", onUp, { passive: true });
  };

  const enableBoardPan = () => {
    const { board } = els();
    if (!board) return;

    const isInteractive = (el) => {
      if (!el) return false;
      if (el.closest && el.closest(".note")) return true;
      if (el.tagName === "TEXTAREA") return true;
      if (el.tagName === "BUTTON") return true;
      return false;
    };

    const down = (e) => {
      if (isInteractive(e.target)) return;
      const p = getPoint(e);
      state.draggingBoard = true;
      state.boardStart = { x: p.x, y: p.y, panX: state.panX, panY: state.panY };
      e.preventDefault?.();
    };

    const move = (e) => {
      if (!state.draggingBoard) return;
      const p = getPoint(e);
      state.panX = state.boardStart.panX + (p.x - state.boardStart.x);
      state.panY = state.boardStart.panY + (p.y - state.boardStart.y);
      applyTransform();
      scheduleSave();
      e.preventDefault?.();
    };

    const up = () => {
      if (!state.draggingBoard) return;
      state.draggingBoard = false;
      scheduleSave();
    };

    board.addEventListener("mousedown", down, { passive: false });
    board.addEventListener("touchstart", down, { passive: false });
    window.addEventListener("mousemove", move, { passive: false });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", up, { passive: true });
    window.addEventListener("touchend", up, { passive: true });
    window.addEventListener("touchcancel", up, { passive: true });

    board.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey) return;
        if (!board) return;
        if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
        setZoomAt(state.zoom + (e.deltaY > 0 ? -0.08 : 0.08), e.clientX, e.clientY);
        e.preventDefault();
      },
      { passive: false }
    );
  };

  const restoreFromStorage = () => {
    const data = load();
    if (!data || data.v !== 2) return;
    state.zoom = clamp(typeof data.zoom === "number" ? data.zoom : 1, state.minZoom, state.maxZoom);
    state.panX = typeof data.panX === "number" ? data.panX : 0;
    state.panY = typeof data.panY === "number" ? data.panY : 0;
    applyTransform();
    const { board } = els();
    if (!board) return;
    board.querySelectorAll(".note").forEach((n) => n.remove());
    state.notes.clear();
    if (Array.isArray(data.notes)) {
      for (const n of data.notes) {
        addNote({
          id: n.id,
          x: typeof n.x === "number" ? n.x : 20,
          y: typeof n.y === "number" ? n.y : 80,
          color: n.color || "#fff7cc",
          text: n.text || "",
          pinned: !!n.pinned,
          z: typeof n.z === "number" ? n.z : Date.now()
        });
      }
    }
    scheduleSave();
  };

  const wireButtons = () => {
    const { enterBtn, addBtn, zoomInBtn, zoomOutBtn } = els();
    if (enterBtn) enterBtn.addEventListener("click", enterBoard);
    if (addBtn) addBtn.addEventListener("click", () => addNote());
    if (zoomInBtn) zoomInBtn.addEventListener("click", zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", zoomOut);
  };

  const init = () => {
    if (state.initialized) return;
    state.initialized = true;
    ensureBoard();
    wireButtons();
    enableBoardPan();
    applyTransform();
    restoreFromStorage();
    window.addEventListener("beforeunload", save, { passive: true });
    setTimeout(save, 50);
  };

  document.addEventListener("DOMContentLoaded", init);

  window.addNote = addNote;
  window.zoomIn = zoomIn;
  window.zoomOut = zoomOut;
  window.enterBoard = enterBoard;
})();