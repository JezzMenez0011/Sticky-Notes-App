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
  const board = document.getElementById("board");
  const colorPicker = document.getElementById("colorPicker");
  if (!board) return;

  const note = document.createElement("div");
  note.className = "note";
  note.style.background = colorPicker ? colorPicker.value : "#fff7cc";
  note.style.left = "20px";
  note.style.top = "80px";
  note.style.zIndex = String(Date.now());

  const del = document.createElement("button");
  del.className = "delete-btn";
  del.type = "button";
  del.textContent = "Delete";

  const textarea = document.createElement("textarea");
  textarea.placeholder = "Write something...";

  del.addEventListener("click", (e) => {
    e.stopPropagation();
    note.remove();
  });

  note.appendChild(del);
  note.appendChild(textarea);
  board.appendChild(note);

  makeDraggable(note);
  textarea.focus();
}

function makeDraggable(note) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  note.addEventListener("mousedown", (e) => {
    const target = e.target;
    if (target && (target.tagName === "TEXTAREA" || target.classList.contains("delete-btn"))) return;

    dragging = true;
    note.style.cursor = "grabbing";
    note.style.zIndex = String(Date.now());

    startX = e.clientX;
    startY = e.clientY;
    startLeft = note.offsetLeft;
    startTop = note.offsetTop;

    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    const dx = (e.clientX - startX) / zoom;
    const dy = (e.clientY - startY) / zoom;

    note.style.left = `${startLeft + dx}px`;
    note.style.top = `${startTop + dy}px`;
  });

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    note.style.cursor = "grab";
  });
}

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