const welcomeScreen = document.getElementById("welcomeScreen");
const app = document.getElementById("app");
const enterBtn = document.getElementById("enterBtn");

const board = document.getElementById("board");
const colorPicker = document.getElementById("colorPicker");

let zoom = 1;

function setZoom(value) {
  zoom = Math.max(0.4, Math.min(2.5, value));
  board.style.transform = `scale(${zoom})`;
}

function zoomIn() {
  setZoom(zoom + 0.1);
}

function zoomOut() {
  setZoom(zoom - 0.1);
}

function enterBoard() {
  welcomeScreen.classList.add("fade-out");
  setTimeout(() => {
    welcomeScreen.style.display = "none";
    app.classList.remove("hidden");
  }, 420);
}

if (enterBtn) {
  enterBtn.addEventListener("click", enterBoard);
}

function addNote() {
  const note = document.createElement("div");
  note.className = "note";
  note.style.background = colorPicker ? colorPicker.value : "#fff7cc";
  note.style.left = "60px";
  note.style.top = "90px";
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
    if (e.target && (e.target.tagName === "TEXTAREA" || e.target.classList.contains("delete-btn"))) {
      return;
    }

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

window.addNote = addNote;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;