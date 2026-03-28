const ably = new Ably.Realtime({
  key: "bwjWJQ.tR9cZg:eNINVizu54OBtUWT5mT10pS5aYWEEJymzSRV-3VW2Pc",
  echoMessages: false
});
const channel = ably.channels.get("sticky-notes-board");

function generateId() {
  return "note-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
}

let zoom = 1;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function setZoom(value) {
  zoom = clamp(value, 0.4, 2.5);
  const board = document.getElementById("board");
  if (board) board.style.transform = `scale(${zoom})`;
}

function zoomIn() {
  setZoom(zoom + 0.1);
}

function zoomOut() {
  setZoom(zoom - 0.1);
}

function enterBoard() {
  const welcomeScreen = document.getElementById("welcomeScreen");
  const app = document.getElementById("app");
  if (!welcomeScreen || !app) return;

  welcomeScreen.classList.add("fade-out");
  setTimeout(() => {
    welcomeScreen.style.display = "none";
    app.classList.remove("hidden");
  }, 420);
}

function addNote() {
  const colorPicker = document.getElementById("colorPicker");
  const color = colorPicker ? colorPicker.value : "#fff7cc";
  const id = generateId(); // ADDED
  const left = "20px";
  const top = "80px";

  createNoteElement(id, color, left, top, ""); 

  channel.publish("note-created", { id, color, left, top }); // ADDED
}

function createNoteElement(id, color, left, top, text) {
  const board = document.getElementById("board");
  if (!board) return;

  const note = document.createElement("div");
  note.className = "note";
  note.id = id; 
  note.style.background = color;
  note.style.left = left;
  note.style.top = top;
  note.style.zIndex = String(Date.now());

  const del = document.createElement("button");
  del.className = "delete-btn";
  del.type = "button";
  del.textContent = "Delete";

  const textarea = document.createElement("textarea");
  textarea.placeholder = "Write something...";
  textarea.value = text; 

  del.addEventListener("click", (e) => {
    e.stopPropagation();
    note.remove();
    channel.publish("note-deleted", { id }); 
  });


  let typingTimer;
  textarea.addEventListener("input", () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      channel.publish("note-updated", { id, text: textarea.value });
    }, 200);
  });

  note.appendChild(del);
  note.appendChild(textarea);
  board.appendChild(note);

  makeDraggable(note, id); 
  textarea.focus();
}

function makeDraggable(note, id) { 
  let dragging = false;
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;

  function getCoords(e) {
    return e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
                     : { x: e.clientX, y: e.clientY };
  }

  function onStart(e) {
    const target = e.target;
    if (target.tagName === "TEXTAREA" || target.classList.contains("delete-btn")) return;

    dragging = true;
    note.style.cursor = "grabbing";
    note.style.zIndex = String(Date.now());

    const { x, y } = getCoords(e);
    startX = x;
    startY = y;
    startLeft = note.offsetLeft;
    startTop = note.offsetTop;

    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;

    const { x, y } = getCoords(e);
    const dx = (x - startX) / zoom;
    const dy = (y - startY) / zoom;

    note.style.left = `${startLeft + dx}px`;
    note.style.top = `${startTop + dy}px`;
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    note.style.cursor = "grab";

    
    channel.publish("note-moved", {
      id,
      left: note.style.left,
      top: note.style.top
    });
  }

  note.addEventListener("mousedown", onStart);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onEnd);

  note.addEventListener("touchstart", onStart, { passive: false });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onEnd);
}


channel.subscribe("note-created", (msg) => {
  const { id, color, left, top } = msg.data;
  createNoteElement(id, color, left, top, "");
});

channel.subscribe("note-moved", (msg) => {
  const { id, left, top } = msg.data;
  const note = document.getElementById(id);
  if (note) {
    note.style.left = left;
    note.style.top = top;
  }
});

channel.subscribe("note-updated", (msg) => {
  const { id, text } = msg.data;
  const note = document.getElementById(id);
  if (note) {
    const textarea = note.querySelector("textarea");
    
    if (textarea && document.activeElement !== textarea) {
      textarea.value = text;
    }
  }
});

channel.subscribe("note-deleted", (msg) => {
  const note = document.getElementById(msg.data.id);
  if (note) note.remove();
});

document.addEventListener("DOMContentLoaded", () => {
  const enterBtn = document.getElementById("enterBtn");
  const addBtn = document.getElementById("addBtn");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");

  if (enterBtn) enterBtn.addEventListener("click", enterBoard);
  if (addBtn) addBtn.addEventListener("click", addNote);
  if (zoomInBtn) zoomInBtn.addEventListener("click", zoomIn);
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", zoomOut);

  setZoom(1);
});

window.addNote = addNote;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.enterBoard = enterBoard;