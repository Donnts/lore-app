// ====== STATE ======
let entries = [];
let activeId = null;

// ====== DOM HOOKS ======
const loreForm = document.getElementById("loreForm");
const entryIdInput = document.getElementById("entryId");
const titleInput = document.getElementById("titleInput");
const typeInput = document.getElementById("typeInput");
const tagsInput = document.getElementById("tagsInput");
const bodyInput = document.getElementById("bodyInput");

const deleteBtn = document.getElementById("deleteBtn");
const clearBtn = document.getElementById("clearBtn");

const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");

const entryList = document.getElementById("entryList");
const countBadge = document.getElementById("countBadge");

const previewCard = document.getElementById("previewCard");
const previewTitle = document.getElementById("previewTitle");
const previewMeta = document.getElementById("previewMeta");
const previewBody = document.getElementById("previewBody");
const previewMedia = document.getElementById("previewMedia");

const themeToggle = document.getElementById("themeToggle");
const themeLabel = document.getElementById("themeLabel");

const mediaFileInput = document.getElementById("mediaFile");
const uploadBtn = document.getElementById("uploadBtn");

// ====== API HELPERS ======

async function apiGetAll() {
  const res = await fetch('/api/lore');
  return res.json();
}

async function apiCreate(data) {
  const res = await fetch('/api/lore', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  return res.json();
}

async function apiUpdate(id, data) {
  const res = await fetch(`/api/lore/${id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  return res.json();
}

async function apiDelete(id) {
  const res = await fetch(`/api/lore/${id}`, {
    method: 'DELETE'
  });
  return res.json();
}

async function apiUploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: fd
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || "Upload failed");
  }

  return res.json();
}

async function apiAttachMedia(entryId, mediaObj) {
  const res = await fetch(`/api/lore/${entryId}/media`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(mediaObj)
  });
  return res.json();
}

// ====== RENDER LOGIC ======
function renderTypeFilterOptions() {
  const types = [...new Set(entries.map(e => e.type).filter(Boolean))].sort();
  const current = typeFilter.value;
  typeFilter.innerHTML = `<option value="">All</option>`;
  types.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    typeFilter.appendChild(opt);
  });
  typeFilter.value = current || "";
}

function getFilteredEntries() {
  const q = searchInput.value.trim().toLowerCase();
  const tf = typeFilter.value.trim().toLowerCase();

  return entries.filter(e => {
    if (tf && e.type.toLowerCase() !== tf) return false;
    if (!q) return true;

    const haystack = [
      e.title,
      e.type,
      e.body,
      (e.tags || []).join(" "),
      (e.media || []).map(m => m.filename).join(" ")
    ].join(" ").toLowerCase();

    return haystack.includes(q);
  });
}

function renderList() {
  entryList.innerHTML = "";
  const filtered = getFilteredEntries();
  countBadge.textContent = filtered.length;

  filtered.forEach(e => {
    const li = document.createElement("li");
    li.className = "entry-item" + (e.id === activeId ? " active" : "");
    li.dataset.id = e.id;

    const topRow = document.createElement("div");
    topRow.className = "entry-top";

    const leftTop = document.createElement("div");
    leftTop.innerHTML = `
      <span>${e.title}</span>
      ${e.type ? `<span class="entry-type">${e.type}</span>` : ""}
    `;

    const rightTop = document.createElement("div");
    rightTop.style.fontSize = ".6rem";
    rightTop.style.color = "var(--text-dim)";
    rightTop.textContent = new Date(e.updatedAt).toLocaleString();

    topRow.appendChild(leftTop);
    topRow.appendChild(rightTop);

    const bottomRow = document.createElement("div");
    bottomRow.className = "entry-bottom";

    const tagPreview = (e.tags || []).slice(0,3)
      .map(t => `<span class="tag-chip">${t}</span>`)
      .join("");

    bottomRow.innerHTML = `${e.body || ""} ${tagPreview}`;

    li.appendChild(topRow);
    li.appendChild(bottomRow);

    li.addEventListener("click", () => {
      activeId = e.id;
      fillForm(e);
      renderList();
      renderPreview(e);
    });

    entryList.appendChild(li);
  });

  if (!filtered.find(e => e.id === activeId)) {
    renderPreview(null);
  }
}

function renderPreview(entry) {
  if (!entry) {
    previewCard.classList.add("hidden");
    previewMedia.innerHTML = "";
    return;
  }

  previewCard.classList.remove("hidden");
  previewTitle.textContent = entry.title;

  const infoBits = [];
  if (entry.type) infoBits.push(entry.type);
  if (entry.tags?.length) infoBits.push("#" + entry.tags.join(" #"));
  infoBits.push("Updated: " + new Date(entry.updatedAt).toLocaleString());
  previewMeta.textContent = infoBits.join(" | ");

  previewBody.textContent = entry.body || "";

  // media area
  previewMedia.innerHTML = "";
  (entry.media || []).forEach(m => {
    const block = document.createElement("div");
    block.className = "media-block";

    if (m.kind === "image") {
      block.innerHTML = `
        <img src="${m.url}" alt="${m.filename}">
        <div>${m.filename}</div>
      `;
    } else if (m.kind === "audio") {
      block.innerHTML = `
        <div>${m.filename}</div>
        <audio controls src="${m.url}"></audio>
      `;
    } else {
      block.innerHTML = `
        <a href="${m.url}" target="_blank" rel="noopener noreferrer">${m.filename}</a>
      `;
    }

    previewMedia.appendChild(block);
  });
}

function fillForm(e) {
  if (!e) {
    entryIdInput.value = "";
    titleInput.value = "";
    typeInput.value = "";
    tagsInput.value = "";
    bodyInput.value = "";
    deleteBtn.disabled = true;
    return;
  }

  entryIdInput.value = e.id;
  titleInput.value = e.title;
  typeInput.value = e.type;
  tagsInput.value = (e.tags || []).join(", ");
  bodyInput.value = e.body;
  deleteBtn.disabled = false;
}

// ====== FORM EVENTS ======

loreForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const idFromForm = entryIdInput.value.trim();
  const payload = {
    title: titleInput.value.trim() || "Untitled",
    type: typeInput.value.trim(),
    tags: tagsInput.value
      .split(",")
      .map(t => t.trim())
      .filter(Boolean),
    body: bodyInput.value.trim()
  };

  if (idFromForm) {
    await apiUpdate(idFromForm, payload);
  } else {
    const saved = await apiCreate(payload);
    activeId = saved.id;
  }

  entries = await apiGetAll();
  renderTypeFilterOptions();
  renderList();
  const current = entries.find(e => e.id === activeId);
  renderPreview(current || null);
  fillForm(current || null);
});

deleteBtn.addEventListener("click", async () => {
  const id = entryIdInput.value.trim();
  if (!id) return;

  await apiDelete(id);

  activeId = null;
  entries = await apiGetAll();
  renderTypeFilterOptions();
  renderList();
  renderPreview(null);
  fillForm(null);
});

clearBtn.addEventListener("click", () => {
  activeId = null;
  fillForm(null);
  renderList();
  renderPreview(null);
});

// ====== UPLOAD EVENTS ======

uploadBtn.addEventListener("click", async () => {
  const file = mediaFileInput.files[0];
  const entryId = entryIdInput.value.trim();

  if (!entryId) {
    alert("Select or create a lore entry first, then upload.");
    return;
  }
  if (!file) {
    alert("Choose a file first.");
    return;
  }

  try {
    // 1. send file to server
    const uploaded = await apiUploadFile(file);
    // uploaded => { filename, url, mimetype, kind }

    // 2. attach file info to this lore entry
    await apiAttachMedia(entryId, uploaded);

    // 3. refresh UI
    entries = await apiGetAll();
    const current = entries.find(e => e.id === entryId);
    activeId = entryId;
    renderList();
    renderPreview(current || null);
    fillForm(current || null);

    // clear picker
    mediaFileInput.value = "";
  } catch (err) {
    alert("Upload failed: " + err.message);
  }
});

// ====== SEARCH / FILTER ======
searchInput.addEventListener("input", () => {
  renderList();
});
typeFilter.addEventListener("change", () => {
  renderList();
});

// ====== THEME ======
function loadTheme() {
  const t = localStorage.getItem("loreTheme");
  if (t === "light") {
    document.documentElement.classList.add("light");
    themeToggle.checked = true;
    themeLabel.textContent = "Light";
  } else {
    document.documentElement.classList.remove("light");
    themeToggle.checked = false;
    themeLabel.textContent = "Dark";
  }
}
function saveTheme() {
  const mode = themeToggle.checked ? "light" : "dark";
  localStorage.setItem("loreTheme", mode);
}
themeToggle.addEventListener("change", () => {
  if (themeToggle.checked) {
    document.documentElement.classList.add("light");
    themeLabel.textContent = "Light";
  } else {
    document.documentElement.classList.remove("light");
    themeLabel.textContent = "Dark";
  }
  saveTheme();
});

// ====== INIT ======
async function init() {
  loadTheme();
  entries = await apiGetAll();
  renderTypeFilterOptions();
  renderList();
  renderPreview(null);
  fillForm(null);
}
init();
