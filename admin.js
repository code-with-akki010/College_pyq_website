const API = window.CampusBytesConfig?.API_BASE_URL || "";
const MAX_FILE_SIZE_MB = 10;

document.addEventListener("DOMContentLoaded", () => {
  loadUploadedPapers();

  const form = document.getElementById("upload-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const validationErrors = validateUploadForm();
    if (validationErrors.length > 0) {
      setStatus("error", validationErrors[0]);
      return;
    }

    setStatus("loading", "Uploading paper...");

    const formData = new FormData();
    formData.append("semester", document.getElementById("semester").value);
    formData.append("subject", document.getElementById("subject").value.trim());
    formData.append("category", document.getElementById("category").value);
    formData.append("year", document.getElementById("year").value);
    formData.append("file", document.getElementById("file").files[0]);

    try {
      const res = await fetch(`${API}/api/upload`, { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setStatus("success", `${data.message} (${data.total} total)`);
      form.reset();
      loadUploadedPapers();
    } catch (err) {
      setStatus("error", err.message);
    }
  });

  form.querySelectorAll("input, select").forEach(field => {
    field.addEventListener("input", () => clearFieldError(field.id));
    field.addEventListener("change", () => clearFieldError(field.id));
  });
});

function validateUploadForm() {
  clearAllFieldErrors();

  const semester = document.getElementById("semester");
  const subject = document.getElementById("subject");
  const category = document.getElementById("category");
  const year = document.getElementById("year");
  const file = document.getElementById("file");
  const selectedFile = file.files[0];
  const currentYear = new Date().getFullYear();
  const errors = [];

  if (!semester.value || Number(semester.value) < 1 || Number(semester.value) > 8) {
    errors.push("Semester must be between 1 and 8.");
    setFieldError("semester", "Use a semester from 1 to 8.");
  }

  if (subject.value.trim().length < 3) {
    errors.push("Subject name must be at least 3 characters.");
    setFieldError("subject", "Enter a clear subject name.");
  }

  if (!category.value) {
    errors.push("Choose a paper category.");
    setFieldError("category", "Select Internal, External, or Practical.");
  }

  if (!year.value || Number(year.value) < 2000 || Number(year.value) > currentYear + 1) {
    errors.push(`Year must be between 2000 and ${currentYear + 1}.`);
    setFieldError("year", `Use a year from 2000 to ${currentYear + 1}.`);
  }

  if (!selectedFile) {
    errors.push("Choose a PDF file to upload.");
    setFieldError("file", "Select a PDF file.");
  } else {
    const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");
    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;

    if (!isPdf) {
      errors.push("Only PDF files are allowed.");
      setFieldError("file", "Upload a .pdf file.");
    }

    if (selectedFile.size > maxBytes) {
      errors.push(`PDF must be smaller than ${MAX_FILE_SIZE_MB} MB.`);
      setFieldError("file", `Maximum file size is ${MAX_FILE_SIZE_MB} MB.`);
    }
  }

  return errors;
}

function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const group = field.closest(".form-group");
  if (!group) return;

  group.classList.add("has-error");
  let error = group.querySelector(".field-error");

  if (!error) {
    error = document.createElement("small");
    error.className = "field-error";
    group.appendChild(error);
  }

  error.textContent = message;
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const group = field.closest(".form-group");
  if (!group) return;

  group.classList.remove("has-error");
  const error = group.querySelector(".field-error");
  if (error) error.remove();
}

function clearAllFieldErrors() {
  ["semester", "subject", "category", "year", "file"].forEach(clearFieldError);
}

function setStatus(type, message) {
  const statusBox = document.getElementById("status-msg");
  const icons = {
    loading: "fa-spinner",
    success: "fa-circle-check",
    error: "fa-circle-exclamation"
  };

  statusBox.className = `status-msg ${type}`;
  statusBox.innerHTML = `<i class="fa-solid ${icons[type]}"></i> ${message}`;
}

function renderAdminState(type, title, message) {
  const list = document.getElementById("papers-list");
  const icons = {
    loading: "fa-spinner",
    empty: "fa-folder-open",
    error: "fa-circle-exclamation"
  };

  list.innerHTML = `
    <li class="admin-list-state ${type}">
      <i class="fa-solid ${icons[type]}"></i>
      <div>
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
    </li>`;
}

function renderDashboardStats(papers = []) {
  const statsGrid = document.getElementById("stats-grid");
  const latestUploads = document.getElementById("latest-uploads");
  const semesterCount = new Set(papers.map(paper => paper.semester)).size;
  const latestYear = papers.length ? Math.max(...papers.map(paper => Number(paper.year))) : "--";
  const categoryCounts = papers.reduce((counts, paper) => {
    counts[paper.category] = (counts[paper.category] || 0) + 1;
    return counts;
  }, {});

  statsGrid.innerHTML = `
    <article class="stat-card">
      <i class="fa-solid fa-file-pdf"></i>
      <div>
        <span>Total Papers</span>
        <strong>${papers.length}</strong>
      </div>
    </article>
    <article class="stat-card">
      <i class="fa-solid fa-layer-group"></i>
      <div>
        <span>Semesters</span>
        <strong>${semesterCount}</strong>
      </div>
    </article>
    <article class="stat-card">
      <i class="fa-solid fa-calendar-days"></i>
      <div>
        <span>Latest Year</span>
        <strong>${latestYear}</strong>
      </div>
    </article>
    <article class="stat-card">
      <i class="fa-solid fa-tags"></i>
      <div>
        <span>Categories</span>
        <strong>${Object.keys(categoryCounts).length}</strong>
      </div>
    </article>`;

  const categorySummary = document.createElement("article");
  categorySummary.className = "category-summary";
  categorySummary.innerHTML = Object.keys(categoryCounts).length
    ? Object.entries(categoryCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, total]) => `<span>${category}: <b>${total}</b></span>`)
        .join("")
    : "<span>No categories yet</span>";
  statsGrid.appendChild(categorySummary);

  const latest = [...papers]
    .sort((a, b) => Number(b.year) - Number(a.year) || Number(b.semester) - Number(a.semester))
    .slice(0, 4);

  latestUploads.innerHTML = latest.length
    ? latest.map(paper => `
        <li>
          <i class="fa-solid fa-file-lines"></i>
          <span>${paper.subject}</span>
          <small>Sem ${paper.semester} - ${paper.category} - ${paper.year}</small>
        </li>`)
      .join("")
    : "<li>No recent papers yet.</li>";
}

async function loadUploadedPapers() {
  const list = document.getElementById("papers-list");
  renderAdminState("loading", "Loading uploads", "Fetching the current paper library.");

  try {
    const res = await fetch(`${API}/api/papers`);
    if (!res.ok) throw new Error("Could not load uploaded papers.");

    const papers = await res.json();
    renderDashboardStats(papers);

    if (papers.length === 0) {
      renderAdminState("empty", "No papers uploaded", "New uploads will appear here after they are saved.");
      return;
    }

    list.innerHTML = "";
    papers.forEach(p => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="paper-info">
          <i class="fa-solid fa-file-pdf"></i>
          <b>Sem ${p.semester}</b> - ${p.subject} - ${p.category} - ${p.year}
        </span>
        <div class="paper-actions">
          <a href="${API}/${p.file}" target="_blank" class="btn-view">
            <i class="fa-solid fa-eye"></i> View
          </a>
          <button class="btn-delete" onclick="deletePaper('${p.file.replace("papers/", "")}')">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>`;
      list.appendChild(li);
    });
  } catch {
    renderDashboardStats([]);
    renderAdminState("error", "Server unavailable", "Could not connect to the paper server. Try again shortly.");
  }
}

async function deletePaper(filename) {
  if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;

  try {
    const res = await fetch(`${API}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    setStatus("success", `${data.message} (${data.total} remaining)`);
    loadUploadedPapers();
  } catch (err) {
    setStatus("error", err.message);
  }
}

