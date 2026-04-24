const API = "";

document.addEventListener("DOMContentLoaded", () => {
  loadUploadedPapers();

  const form = document.getElementById("upload-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusBox = document.getElementById("status-msg");
    statusBox.className = "status-msg";
    statusBox.textContent = "⏳ Uploading…";

    const formData = new FormData();
    formData.append("semester", document.getElementById("semester").value);
    formData.append("subject",  document.getElementById("subject").value.trim());
    formData.append("category", document.getElementById("category").value);
    formData.append("year",     document.getElementById("year").value);
    formData.append("file",     document.getElementById("file").files[0]);

    try {
      const res  = await fetch(`${API}/api/upload`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      statusBox.className   = "status-msg success";
      statusBox.textContent = data.message + ` (${data.total} total)`;
      form.reset();
      loadUploadedPapers();           // refresh list automatically
    } catch (err) {
      statusBox.className   = "status-msg error";
      statusBox.textContent = "❌ " + err.message;
    }
  });
});

// ── Load & display all uploaded papers ────────────────────────────────────────
async function loadUploadedPapers() {
  const list = document.getElementById("papers-list");
  list.innerHTML = "<li class='loading'>Loading…</li>";

  try {
    const res    = await fetch(`${API}/api/papers`);
    const papers = await res.json();

    if (papers.length === 0) {
      list.innerHTML = "<li class='empty'>No papers uploaded yet.</li>";
      return;
    }

    list.innerHTML = "";
    papers.forEach(p => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="paper-info">
          <i class="fa-solid fa-file-pdf"></i>
          <b>Sem ${p.semester}</b> · ${p.subject} · ${p.category} · ${p.year}
        </span>
        <div class="paper-actions">
          <a href="${API}/${p.file}" target="_blank" class="btn-view">
            <i class="fa-solid fa-eye"></i> View
          </a>
          <button class="btn-delete" onclick="deletePaper('${p.file.replace("papers/","")}')">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>`;
      list.appendChild(li);
    });
  } catch {
    list.innerHTML = "<li class='error'>⚠️ Could not connect to server. Is it running?</li>";
  }
}

// ── Delete a paper ─────────────────────────────────────────────────────────────
async function deletePaper(filename) {
  if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;

  try {
    const res  = await fetch(`${API}/api/delete`, {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ filename })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const statusBox = document.getElementById("status-msg");
    statusBox.className   = "status-msg success";
    statusBox.textContent = data.message + ` (${data.total} remaining)`;
    loadUploadedPapers();
  } catch (err) {
    alert("❌ " + err.message);
  }
}
