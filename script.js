const API = window.CampusBytesConfig?.API_BASE_URL || "";
const BOOKMARKS_KEY = "campusbytes-bookmarked-papers";
let papersData = [];
let bookmarkedFiles = getStoredBookmarks();
let currentViewMode = "list";

async function fetchData() {
  renderListState("loading", "Loading papers", "Fetching the latest question papers for you.");

  try {
    const res = await fetch(`${API}/api/papers`);
    if (!res.ok) throw new Error("Could not load papers.");
    papersData = await res.json();
    populateFilters();
    setupFilterControls();
    setupQuickSearch();
    setupBookmarkControls();
    setupViewControls();
    renderBookmarkedPapers();
    renderRecentPapers();
    renderPapers(papersData, "Start by searching or choose filters to find papers.");
  } catch {
    renderListState("error", "Server unavailable", "Please check your connection or try again in a moment.");
  }
}

function getSelectedFilters() {
  return {
    semester: document.getElementById("semester").value,
    subject: document.getElementById("subject").value,
    category: document.getElementById("category").value,
    year: document.getElementById("year").value
  };
}

function filterPapers(filters = getSelectedFilters()) {
  return papersData.filter(paper =>
    (!filters.semester || paper.semester == filters.semester) &&
    (!filters.subject || paper.subject == filters.subject) &&
    (!filters.category || paper.category == filters.category) &&
    (!filters.year || paper.year == filters.year)
  );
}

function getFilteredOptions(targetKey, filters = getSelectedFilters()) {
  return papersData
    .filter(paper =>
      (targetKey === "semester" || !filters.semester || paper.semester == filters.semester) &&
      (targetKey === "subject" || !filters.subject || paper.subject == filters.subject) &&
      (targetKey === "category" || !filters.category || paper.category == filters.category) &&
      (targetKey === "year" || !filters.year || paper.year == filters.year)
    )
    .map(paper => paper[targetKey]);
}

function setSelectOptions(selectId, values, label, formatter = value => value, descending = false) {
  const select = document.getElementById(selectId);
  const previousValue = select.value;
  const uniqueValues = [...new Set(values)].sort((a, b) => {
    if (!Number.isNaN(Number(a)) && !Number.isNaN(Number(b))) {
      return descending ? Number(b) - Number(a) : Number(a) - Number(b);
    }
    return String(a).localeCompare(String(b));
  });

  select.innerHTML = `<option value="">All ${label}</option>`;
  uniqueValues.forEach(value => {
    select.innerHTML += `<option value="${value}">${formatter(value)}</option>`;
  });

  select.value = uniqueValues.some(value => String(value) === String(previousValue)) ? previousValue : "";
}

function populateFilters() {
  const filters = getSelectedFilters();

  setSelectOptions("semester", getFilteredOptions("semester", filters), "Semesters", value => `Semester ${value}`);
  setSelectOptions("subject", getFilteredOptions("subject", filters), "Papers");
  setSelectOptions("category", getFilteredOptions("category", filters), "Categories");
  setSelectOptions("year", getFilteredOptions("year", filters), "Years", value => value, true);
}

function loadPapers() {
  document.getElementById("paper-search").value = "";
  renderPapers(filterPapers(), "No papers found for these filters.");
}

function resetFilters() {
  document.getElementById("semester").value = "";
  document.getElementById("subject").value = "";
  document.getElementById("category").value = "";
  document.getElementById("year").value = "";
  document.getElementById("paper-search").value = "";
  populateFilters();
  renderPapers(papersData, "Start by searching or choose filters to find papers.");
}

function setupFilterControls() {
  ["semester", "subject", "category", "year"].forEach(selectId => {
    document.getElementById(selectId).addEventListener("change", () => {
      document.getElementById("paper-search").value = "";
      populateFilters();
      renderPapers(filterPapers(), "No papers found for these filters.");
    });
  });

  document.getElementById("apply-filters").addEventListener("click", loadPapers);
  document.getElementById("reset-filters").addEventListener("click", resetFilters);
}

function setupQuickSearch() {
  const searchInput = document.getElementById("paper-search");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
      renderPapers(filterPapers(), "Start by searching or choose filters to find papers.");
      return;
    }

    const results = papersData.filter(paper => {
      const searchableText = [
        `semester ${paper.semester}`,
        `sem ${paper.semester}`,
        paper.subject,
        paper.category,
        paper.year
      ].join(" ").toLowerCase();

      return query.split(/\s+/).every(term => searchableText.includes(term));
    });

    renderPapers(results, "No papers match your search.");
  });
}

function getStoredBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveBookmarks() {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarkedFiles));
}

function isBookmarked(file) {
  return bookmarkedFiles.includes(file);
}

function toggleBookmark(index) {
  const paper = papersData[index];
  if (!paper) return;

  bookmarkedFiles = isBookmarked(paper.file)
    ? bookmarkedFiles.filter(file => file !== paper.file)
    : [...bookmarkedFiles, paper.file];

  saveBookmarks();
  renderBookmarkedPapers();
  renderPapers(getCurrentResults(), "No papers found for these filters.");
}

function clearBookmarks() {
  bookmarkedFiles = [];
  saveBookmarks();
  renderBookmarkedPapers();
  renderPapers(getCurrentResults(), "No papers found for these filters.");
}

function getCurrentResults() {
  const query = document.getElementById("paper-search").value.trim().toLowerCase();
  if (!query) return filterPapers();

  return papersData.filter(paper => {
    const searchableText = [
      `semester ${paper.semester}`,
      `sem ${paper.semester}`,
      paper.subject,
      paper.category,
      paper.year
    ].join(" ").toLowerCase();

    return query.split(/\s+/).every(term => searchableText.includes(term));
  });
}

function setupBookmarkControls() {
  const clearButton = document.getElementById("clear-bookmarks");
  const recentButton = document.getElementById("show-all-recent");

  if (clearButton) {
    clearButton.addEventListener("click", clearBookmarks);
  }

  if (recentButton) {
    recentButton.addEventListener("click", () => {
      renderPapers(getRecentPapers(papersData.length), "No recent papers found.");
      document.querySelector(".available-section").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function setupViewControls() {
  document.querySelectorAll("[data-view-mode]").forEach(button => {
    button.addEventListener("click", () => {
      currentViewMode = button.dataset.viewMode;
      document.querySelectorAll("[data-view-mode]").forEach(item => {
        item.classList.toggle("active", item === button);
      });
      renderPapers(getCurrentResults(), "No papers found for these filters.");
    });
  });
}

function openPaperPreview(index) {
  const paper = papersData[index];
  if (!paper) return;

  const fileUrl = `${API}/${paper.file}`;
  const modal = document.getElementById("pdf-modal");
  const frame = document.getElementById("pdf-frame");
  const title = document.getElementById("pdf-title");
  const meta = document.getElementById("pdf-meta");
  const openLink = document.getElementById("pdf-open");
  const downloadLink = document.getElementById("pdf-download");

  title.textContent = paper.subject;
  meta.textContent = `Semester ${paper.semester} - ${paper.category} - ${paper.year}`;
  frame.src = fileUrl;
  openLink.href = fileUrl;
  downloadLink.href = fileUrl;
  downloadLink.setAttribute("download", paper.file.split("/").pop());

  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closePaperPreview() {
  const modal = document.getElementById("pdf-modal");
  const frame = document.getElementById("pdf-frame");

  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  frame.src = "";
}

function setupPaperPreview() {
  document.querySelectorAll("[data-close-preview]").forEach(button => {
    button.addEventListener("click", closePaperPreview);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closePaperPreview();
    }
  });
}

function renderPapers(papers, emptyMessage) {
  const list = document.getElementById("papers");
  list.innerHTML = "";

  if (papers.length === 0) {
    renderListState("empty", "No papers found", emptyMessage);
    return;
  }

  if (currentViewMode !== "list") {
    renderGroupedPapers(papers, currentViewMode);
    return;
  }

  papers.forEach(paper => {
    list.innerHTML += renderPaperCard(paper);
  });
}

function renderGroupedPapers(papers, mode) {
  const list = document.getElementById("papers");
  const groups = papers.reduce((grouped, paper) => {
    const key = mode === "semester" ? `Semester ${paper.semester}` : paper.subject;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(paper);
    return grouped;
  }, {});

  const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
    if (mode === "semester") {
      return Number(a.replace("Semester ", "")) - Number(b.replace("Semester ", ""));
    }
    return a.localeCompare(b);
  });

  list.innerHTML = sortedGroups.map(([groupName, groupPapers]) => `
    <li class="paper-group">
      <div class="group-heading">
        <h3>${groupName}</h3>
        <span>${groupPapers.length} paper${groupPapers.length === 1 ? "" : "s"}</span>
      </div>
      <ul>
        ${groupPapers
          .sort((a, b) => Number(b.year) - Number(a.year) || String(a.category).localeCompare(String(b.category)))
          .map(renderPaperCard)
          .join("")}
      </ul>
    </li>`)
    .join("");
}

function renderPaperCard(paper) {
  const paperIndex = papersData.indexOf(paper);
  const saved = isBookmarked(paper.file);

  return `
    <li class="paper-card">
      <div class="paper-card-inner">
        <button type="button" class="paper-preview" onclick="openPaperPreview(${paperIndex})">
          <i class="fa-solid fa-file-pdf"></i>
          <span>${paper.subject}</span>
          <small>Semester ${paper.semester} - ${paper.category} - ${paper.year}</small>
          <b>Preview</b>
        </button>
        <button class="bookmark-btn ${saved ? "saved" : ""}" type="button" onclick="toggleBookmark(${paperIndex})" aria-label="${saved ? "Remove bookmark" : "Save paper"}">
          <i class="fa-${saved ? "solid" : "regular"} fa-bookmark"></i>
        </button>
      </div>
    </li>`;
}

function renderBookmarkedPapers() {
  const list = document.getElementById("bookmarked-papers");
  const clearButton = document.getElementById("clear-bookmarks");
  if (!list) return;

  const savedPapers = bookmarkedFiles
    .map(file => papersData.find(paper => paper.file === file))
    .filter(Boolean);

  clearButton.disabled = savedPapers.length === 0;
  list.innerHTML = "";

  if (savedPapers.length === 0) {
    list.innerHTML = `
      <li class="list-state empty compact">
        <i class="fa-solid fa-bookmark"></i>
        <div>
          <strong>No saved papers yet</strong>
          <p>Tap the bookmark icon on any paper to save it here.</p>
        </div>
      </li>`;
    return;
  }

  savedPapers.forEach(paper => {
    list.innerHTML += renderPaperCard(paper);
  });
}

function getRecentPapers(limit = 6) {
  return [...papersData]
    .sort((a, b) =>
      Number(b.year) - Number(a.year) ||
      Number(b.semester) - Number(a.semester) ||
      String(a.subject).localeCompare(String(b.subject))
    )
    .slice(0, limit);
}

function renderRecentPapers() {
  const list = document.getElementById("recent-papers");
  if (!list) return;

  const recentPapers = getRecentPapers();
  list.innerHTML = "";

  if (recentPapers.length === 0) {
    list.innerHTML = `
      <li class="list-state empty compact">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <div>
          <strong>No recent papers yet</strong>
          <p>Recent uploads will appear here after papers load.</p>
        </div>
      </li>`;
    return;
  }

  recentPapers.forEach(paper => {
    list.innerHTML += renderPaperCard(paper);
  });
}

function renderListState(type, title, message) {
  const list = document.getElementById("papers");
  const icons = {
    loading: "fa-spinner",
    empty: "fa-folder-open",
    error: "fa-circle-exclamation"
  };

  list.innerHTML = `
    <li class="list-state ${type}">
      <i class="fa-solid ${icons[type]}"></i>
      <div>
        <strong>${title}</strong>
        <p>${message}</p>
      </div>
    </li>`;
}

setupPaperPreview();
fetchData();

