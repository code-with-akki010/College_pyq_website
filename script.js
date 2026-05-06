const API = window.CampusBytesConfig?.API_BASE_URL || "";
const BOOKMARKS_KEY = "campusbytes-bookmarked-papers";
const REVIEWED_KEY = "campusbytes-reviewed-papers";
const XP_KEY = "campusbytes-study-xp";
const ANALYTICS_KEY = "campusbytes-study-analytics";

const XP_EVENTS = {
  open_unique: 8,
  open_repeat: 2,
  bookmark_add: 4,
  review_add: 20,
  sprint_run: 6
};

let papersData = [];
let bookmarkedFiles = getStoredList(BOOKMARKS_KEY);
let reviewedFiles = getStoredList(REVIEWED_KEY);
let currentViewMode = "list";
let studyXp = getStoredXp();
let studyAnalytics = getStoredAnalytics();

function notify(type, message, duration) {
  window.CampusBytesUI?.showToast(message, { type, duration });
}

function getStoredList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function getStoredXp() {
  try {
    const parsed = JSON.parse(localStorage.getItem(XP_KEY));
    return Number.isFinite(parsed?.total) ? parsed : { total: 0 };
  } catch {
    return { total: 0 };
  }
}

function saveXp() {
  localStorage.setItem(XP_KEY, JSON.stringify(studyXp));
}

function getStoredAnalytics() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ANALYTICS_KEY));
    return {
      subjectViews: parsed?.subjectViews || {},
      coViews: parsed?.coViews || {},
      lastViewedSubject: parsed?.lastViewedSubject || "",
      activityDays: Array.isArray(parsed?.activityDays) ? parsed.activityDays : [],
      dailyProgress: parsed?.dailyProgress || {}
    };
  } catch {
    return {
      subjectViews: {},
      coViews: {},
      lastViewedSubject: "",
      activityDays: [],
      dailyProgress: {}
    };
  }
}

function saveAnalytics() {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(studyAnalytics));
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDailyProgress() {
  const today = getTodayKey();
  if (!studyAnalytics.dailyProgress[today]) {
    studyAnalytics.dailyProgress[today] = {
      openedFiles: [],
      reviewedFiles: []
    };
  }
  return studyAnalytics.dailyProgress[today];
}

function markActiveToday() {
  const today = getTodayKey();
  if (!studyAnalytics.activityDays.includes(today)) {
    studyAnalytics.activityDays.push(today);
    studyAnalytics.activityDays.sort();
  }
}

function getCurrentStreak() {
  const days = [...studyAnalytics.activityDays].sort();
  if (days.length === 0) return 0;

  let streak = 0;
  let cursor = new Date();
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.includes(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getXpLevelInfo(totalXp) {
  let level = 1;
  let xp = totalXp;
  let needed = 100;

  while (xp >= needed) {
    xp -= needed;
    level += 1;
    needed = Math.round(needed * 1.18);
  }

  return {
    level,
    xpInLevel: xp,
    xpToNext: needed,
    progress: Math.min(100, Math.round((xp / needed) * 100))
  };
}

function awardXp(eventKey, details = {}) {
  const base = XP_EVENTS[eventKey] || 0;
  if (!base) return;

  markActiveToday();
  const streak = getCurrentStreak();
  const multiplier = Math.min(1.5, 1 + (streak - 1) * 0.05);
  const gained = Math.max(1, Math.round(base * multiplier));

  studyXp.total += gained;
  saveXp();
  saveAnalytics();
  renderStudyHub();

  if (!details.silent) {
    notify("success", `+${gained} XP`, 1400);
  }
}

async function fetchData() {
  renderListState("loading", "Loading papers", "Fetching the latest question papers for you.");

  try {
    const res = await fetch(`${API}/api/papers`);
    if (!res.ok) throw new Error("Could not load papers.");

    papersData = await res.json();
    populateFilters();
    setupFilterControls();
    setupQuickSearch();
    setupActiveFilterChips();
    setupBookmarkControls();
    setupViewControls();
    setupStudyHubControls();
    setupPaperPreview();

    renderBookmarkedPapers();
    renderRecentPapers();
    renderRecommendedPapers();
    renderExamSprintPapers();
    renderPapers(papersData, "Start by searching or choose filters to find papers.");
    renderActiveFilters();
    renderStudyHub();
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

function getSearchQuery() {
  const input = document.getElementById("paper-search");
  return input ? input.value.trim().toLowerCase() : "";
}

function filterPapers(filters = getSelectedFilters()) {
  return papersData.filter((paper) =>
    (!filters.semester || paper.semester == filters.semester) &&
    (!filters.subject || paper.subject == filters.subject) &&
    (!filters.category || paper.category == filters.category) &&
    (!filters.year || paper.year == filters.year)
  );
}

function getFilteredOptions(targetKey, filters = getSelectedFilters()) {
  return papersData
    .filter((paper) =>
      (targetKey === "semester" || !filters.semester || paper.semester == filters.semester) &&
      (targetKey === "subject" || !filters.subject || paper.subject == filters.subject) &&
      (targetKey === "category" || !filters.category || paper.category == filters.category) &&
      (targetKey === "year" || !filters.year || paper.year == filters.year)
    )
    .map((paper) => paper[targetKey]);
}

function setSelectOptions(selectId, values, label, formatter = (value) => value, descending = false) {
  const select = document.getElementById(selectId);
  const previousValue = select.value;
  const uniqueValues = [...new Set(values)].sort((a, b) => {
    if (!Number.isNaN(Number(a)) && !Number.isNaN(Number(b))) {
      return descending ? Number(b) - Number(a) : Number(a) - Number(b);
    }
    return String(a).localeCompare(String(b));
  });

  select.innerHTML = `<option value="">All ${label}</option>`;
  uniqueValues.forEach((value) => {
    select.innerHTML += `<option value="${value}">${formatter(value)}</option>`;
  });

  select.value = uniqueValues.some((value) => String(value) === String(previousValue)) ? previousValue : "";
}

function populateFilters() {
  const filters = getSelectedFilters();
  setSelectOptions("semester", getFilteredOptions("semester", filters), "Semesters", (value) => `Semester ${value}`);
  setSelectOptions("subject", getFilteredOptions("subject", filters), "Papers");
  setSelectOptions("category", getFilteredOptions("category", filters), "Categories");
  setSelectOptions("year", getFilteredOptions("year", filters), "Years", (value) => value, true);
}

function getCurrentResults() {
  const query = getSearchQuery();
  if (!query) return filterPapers();

  return filterPapers().filter((paper) => {
    const searchable = [
      `semester ${paper.semester}`,
      `sem ${paper.semester}`,
      paper.subject,
      paper.category,
      paper.year
    ].join(" ").toLowerCase();
    return query.split(/\s+/).every((term) => searchable.includes(term));
  });
}

function loadPapers() {
  document.getElementById("paper-search").value = "";
  renderPapers(filterPapers(), "No papers found for these filters.");
  renderActiveFilters();
}

function resetFilters() {
  document.getElementById("semester").value = "";
  document.getElementById("subject").value = "";
  document.getElementById("category").value = "";
  document.getElementById("year").value = "";
  document.getElementById("paper-search").value = "";
  populateFilters();
  renderPapers(papersData, "Start by searching or choose filters to find papers.");
  renderActiveFilters();
  notify("info", "Filters reset");
}

function setupFilterControls() {
  ["semester", "subject", "category", "year"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => {
      document.getElementById("paper-search").value = "";
      populateFilters();
      renderPapers(filterPapers(), "No papers found for these filters.");
      renderActiveFilters();
    });
  });

  document.getElementById("apply-filters").addEventListener("click", loadPapers);
  document.getElementById("reset-filters").addEventListener("click", resetFilters);
}

function setupQuickSearch() {
  const searchInput = document.getElementById("paper-search");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const query = getSearchQuery();
    if (!query) {
      renderPapers(filterPapers(), "Start by searching or choose filters to find papers.");
      renderActiveFilters();
      return;
    }
    renderPapers(getCurrentResults(), "No papers match your search.");
    renderActiveFilters();
  });
}

function setupActiveFilterChips() {
  const container = document.getElementById("active-filters");
  if (!container) return;

  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-filter]");
    if (!button) return;

    const key = button.dataset.removeFilter;
    if (key === "search") {
      document.getElementById("paper-search").value = "";
    } else {
      document.getElementById(key).value = "";
      populateFilters();
    }

    renderPapers(getCurrentResults(), "No papers found for these filters.");
    renderActiveFilters();
  });
}

function renderActiveFilters() {
  const container = document.getElementById("active-filters");
  if (!container) return;

  const filters = getSelectedFilters();
  const query = getSearchQuery();
  const chips = [];

  if (filters.semester) chips.push({ key: "semester", text: `Semester ${filters.semester}` });
  if (filters.subject) chips.push({ key: "subject", text: filters.subject });
  if (filters.category) chips.push({ key: "category", text: filters.category });
  if (filters.year) chips.push({ key: "year", text: filters.year });
  if (query) chips.push({ key: "search", text: `Search: ${query}` });

  if (chips.length === 0) {
    container.innerHTML = `<span class="active-filters-empty">No active filters</span>`;
    return;
  }

  container.innerHTML = chips.map((chip) => `
    <span class="active-filter-chip">
      ${chip.text}
      <button type="button" data-remove-filter="${chip.key}" aria-label="Remove ${chip.text}">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </span>`).join("");
}

function setupBookmarkControls() {
  const clearButton = document.getElementById("clear-bookmarks");
  const recentButton = document.getElementById("show-all-recent");

  if (clearButton) clearButton.addEventListener("click", clearBookmarks);
  if (recentButton) {
    recentButton.addEventListener("click", () => {
      renderPapers(getRecentPapers(papersData.length), "No recent papers found.");
      document.querySelector(".available-section").scrollIntoView({ behavior: "smooth", block: "start" });
      notify("info", "Showing recent papers");
    });
  }
}

function setupViewControls() {
  document.querySelectorAll("[data-view-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      currentViewMode = button.dataset.viewMode;
      document.querySelectorAll("[data-view-mode]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      renderPapers(getCurrentResults(), "No papers found for these filters.");
    });
  });
}

function setupStudyHubControls() {
  const sprintButton = document.getElementById("run-sprint");
  const sprintCategory = document.getElementById("sprint-category");
  const resetStudy = document.getElementById("reset-study-progress");

  if (sprintButton) {
    sprintButton.addEventListener("click", () => {
      renderExamSprintPapers();
      awardXp("sprint_run", { silent: true });
      notify("info", "Exam sprint refreshed");
    });
  }

  if (sprintCategory) {
    sprintCategory.addEventListener("change", renderExamSprintPapers);
  }

  if (resetStudy) {
    resetStudy.addEventListener("click", () => {
      if (!confirm("Reset XP, reviewed marks, and recommendation history?")) return;
      reviewedFiles = [];
      studyXp = { total: 0 };
      studyAnalytics = getStoredAnalytics();
      studyAnalytics.subjectViews = {};
      studyAnalytics.coViews = {};
      studyAnalytics.lastViewedSubject = "";
      studyAnalytics.activityDays = [];
      studyAnalytics.dailyProgress = {};
      saveList(REVIEWED_KEY, reviewedFiles);
      saveXp();
      saveAnalytics();
      renderStudyHub();
      renderPapers(getCurrentResults(), "No papers found for these filters.");
      renderRecommendedPapers();
      notify("info", "Study progress reset");
    });
  }
}

function saveBookmarks() {
  saveList(BOOKMARKS_KEY, bookmarkedFiles);
}

function saveReviewed() {
  saveList(REVIEWED_KEY, reviewedFiles);
}

function isBookmarked(file) {
  return bookmarkedFiles.includes(file);
}

function isReviewed(file) {
  return reviewedFiles.includes(file);
}

function toggleBookmark(index) {
  const paper = papersData[index];
  if (!paper) return;

  const wasSaved = isBookmarked(paper.file);
  bookmarkedFiles = wasSaved
    ? bookmarkedFiles.filter((file) => file !== paper.file)
    : [...bookmarkedFiles, paper.file];

  saveBookmarks();
  if (!wasSaved) awardXp("bookmark_add", { silent: true });
  renderBookmarkedPapers();
  renderPapers(getCurrentResults(), "No papers found for these filters.");
  notify(wasSaved ? "info" : "success", wasSaved ? `Removed: ${paper.subject}` : `Saved: ${paper.subject}`);
}

function toggleReviewed(index) {
  const paper = papersData[index];
  if (!paper) return;

  const wasReviewed = isReviewed(paper.file);
  reviewedFiles = wasReviewed
    ? reviewedFiles.filter((file) => file !== paper.file)
    : [...reviewedFiles, paper.file];

  if (!wasReviewed) {
    const todayProgress = getDailyProgress();
    if (!todayProgress.reviewedFiles.includes(paper.file)) {
      todayProgress.reviewedFiles.push(paper.file);
    }
    markActiveToday();
    awardXp("review_add", { silent: true });
  }

  saveReviewed();
  saveAnalytics();
  renderStudyHub();
  renderRecommendedPapers();
  renderPapers(getCurrentResults(), "No papers found for these filters.");
  notify(wasReviewed ? "info" : "success", wasReviewed ? `Unmarked: ${paper.subject}` : `Reviewed: ${paper.subject}`);
}

function clearBookmarks() {
  if (bookmarkedFiles.length === 0) return;
  bookmarkedFiles = [];
  saveBookmarks();
  renderBookmarkedPapers();
  renderPapers(getCurrentResults(), "No papers found for these filters.");
  notify("info", "All saved papers cleared");
}

function recordPaperView(paper) {
  const subject = String(paper.subject || "").trim();
  if (!subject) return;

  const todayProgress = getDailyProgress();
  const uniqueOpen = !todayProgress.openedFiles.includes(paper.file);
  if (uniqueOpen) todayProgress.openedFiles.push(paper.file);

  markActiveToday();
  studyAnalytics.subjectViews[subject] = (studyAnalytics.subjectViews[subject] || 0) + 1;

  const prev = studyAnalytics.lastViewedSubject;
  if (prev && prev !== subject) {
    if (!studyAnalytics.coViews[prev]) studyAnalytics.coViews[prev] = {};
    studyAnalytics.coViews[prev][subject] = (studyAnalytics.coViews[prev][subject] || 0) + 1;
  }

  studyAnalytics.lastViewedSubject = subject;
  saveAnalytics();
  awardXp(uniqueOpen ? "open_unique" : "open_repeat", { silent: true });
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

  recordPaperView(paper);
  renderStudyHub();
  renderRecommendedPapers();

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
  document.querySelectorAll("[data-close-preview]").forEach((button) => {
    button.addEventListener("click", closePaperPreview);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePaperPreview();
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

  papers.forEach((paper) => {
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
    if (mode === "semester") return Number(a.replace("Semester ", "")) - Number(b.replace("Semester ", ""));
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
    </li>`).join("");
}

function renderPaperCard(paper) {
  const index = papersData.indexOf(paper);
  const saved = isBookmarked(paper.file);
  const reviewed = isReviewed(paper.file);

  return `
    <li class="paper-card">
      <div class="paper-card-inner">
        <button type="button" class="paper-preview" onclick="openPaperPreview(${index})">
          <i class="fa-solid fa-file-pdf"></i>
          <span>${paper.subject}</span>
          <small>Semester ${paper.semester} - ${paper.category} - ${paper.year}</small>
          <b>Preview</b>
        </button>
        <div class="paper-utility">
          <button class="review-btn ${reviewed ? "reviewed" : ""}" type="button" onclick="toggleReviewed(${index})" aria-label="${reviewed ? "Unmark reviewed" : "Mark reviewed"}">
            <i class="fa-solid fa-check"></i> ${reviewed ? "Reviewed" : "Review"}
          </button>
          <button class="bookmark-btn ${saved ? "saved" : ""}" type="button" onclick="toggleBookmark(${index})" aria-label="${saved ? "Remove bookmark" : "Save paper"}">
            <i class="fa-${saved ? "solid" : "regular"} fa-bookmark"></i>
          </button>
        </div>
      </div>
    </li>`;
}

function renderBookmarkedPapers() {
  const list = document.getElementById("bookmarked-papers");
  const clearButton = document.getElementById("clear-bookmarks");
  if (!list) return;

  const savedPapers = bookmarkedFiles
    .map((file) => papersData.find((paper) => paper.file === file))
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

  savedPapers.forEach((paper) => {
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

  recentPapers.forEach((paper) => {
    list.innerHTML += renderPaperCard(paper);
  });
}

function getRecommendedPapers(limit = 6) {
  if (papersData.length === 0) return [];

  const scores = new Map();
  const last = studyAnalytics.lastViewedSubject;
  const coViewForLast = last ? (studyAnalytics.coViews[last] || {}) : {};

  papersData.forEach((paper) => {
    let score = 0;
    score += (coViewForLast[paper.subject] || 0) * 20;
    score += (studyAnalytics.subjectViews[paper.subject] || 0) * 4;
    score += Number(paper.year) * 0.2;
    if (isReviewed(paper.file)) score -= 10;
    scores.set(paper.file, score);
  });

  return [...papersData]
    .sort((a, b) => (scores.get(b.file) || 0) - (scores.get(a.file) || 0))
    .slice(0, limit);
}

function renderRecommendedPapers() {
  const list = document.getElementById("recommended-papers");
  if (!list) return;

  const recos = getRecommendedPapers();
  list.innerHTML = "";

  if (recos.length === 0) {
    list.innerHTML = `
      <li class="list-state empty compact">
        <i class="fa-solid fa-lightbulb"></i>
        <div>
          <strong>No recommendations yet</strong>
          <p>Open some papers to unlock smart suggestions.</p>
        </div>
      </li>`;
    return;
  }

  recos.forEach((paper) => {
    list.innerHTML += renderPaperCard(paper);
  });
}

function getExamSprintPapers(limit = 6) {
  const category = document.getElementById("sprint-category")?.value || "";
  const currentYear = Math.max(...papersData.map((paper) => Number(paper.year)));

  return [...papersData]
    .filter((paper) => !category || paper.category === category)
    .map((paper) => {
      const recencyScore = Math.max(0, 6 - (currentYear - Number(paper.year))) * 8;
      const categoryBonus =
        paper.category === "External" ? 15 :
          paper.category === "Internal" ? 10 : 7;
      const familiarityBonus = studyAnalytics.subjectViews[paper.subject] ? 4 : 0;
      const reviewedPenalty = isReviewed(paper.file) ? -12 : 0;
      return { paper, score: recencyScore + categoryBonus + familiarityBonus + reviewedPenalty };
    })
    .sort((a, b) => b.score - a.score || Number(b.paper.year) - Number(a.paper.year))
    .slice(0, limit)
    .map((entry) => entry.paper);
}

function renderExamSprintPapers() {
  const list = document.getElementById("sprint-papers");
  if (!list) return;

  const sprint = getExamSprintPapers();
  list.innerHTML = "";

  if (sprint.length === 0) {
    list.innerHTML = `
      <li class="list-state empty compact">
        <i class="fa-solid fa-bolt"></i>
        <div>
          <strong>No sprint papers found</strong>
          <p>Change category or clear filters to widen the sprint set.</p>
        </div>
      </li>`;
    return;
  }

  sprint.forEach((paper) => {
    list.innerHTML += renderPaperCard(paper);
  });
}

function renderStudyHub() {
  renderXpPanel();
  renderSemesterProgress();
  renderMissionPanel();
}

function renderXpPanel() {
  const levelEl = document.getElementById("xp-level");
  const totalEl = document.getElementById("xp-total");
  const fillEl = document.getElementById("xp-fill");
  const nextEl = document.getElementById("xp-next");
  const streakEl = document.getElementById("xp-streak");
  const trackEl = document.querySelector(".xp-track");
  if (!levelEl || !totalEl || !fillEl || !nextEl || !streakEl || !trackEl) return;

  const levelInfo = getXpLevelInfo(studyXp.total);
  const streak = getCurrentStreak();

  levelEl.textContent = String(levelInfo.level);
  totalEl.textContent = String(studyXp.total);
  fillEl.style.width = `${levelInfo.progress}%`;
  nextEl.textContent = `${levelInfo.xpInLevel} / ${levelInfo.xpToNext} XP to next level`;
  streakEl.textContent = `Day streak: ${streak}`;
  trackEl.setAttribute("aria-valuenow", String(levelInfo.progress));
}

function renderSemesterProgress() {
  const list = document.getElementById("semester-progress");
  if (!list) return;

  const semesterMap = papersData.reduce((map, paper) => {
    const key = Number(paper.semester);
    if (!map[key]) map[key] = { total: 0, reviewed: 0 };
    map[key].total += 1;
    if (isReviewed(paper.file)) map[key].reviewed += 1;
    return map;
  }, {});

  const semesters = Object.keys(semesterMap)
    .map(Number)
    .sort((a, b) => a - b);

  if (semesters.length === 0) {
    list.innerHTML = "<li class=\"active-filters-empty\">No paper data yet</li>";
    return;
  }

  list.innerHTML = semesters.map((sem) => {
    const stats = semesterMap[sem];
    const pct = stats.total ? Math.round((stats.reviewed / stats.total) * 100) : 0;
    return `
      <li class="semester-progress-item">
        <strong>Semester ${sem}: ${stats.reviewed}/${stats.total} reviewed</strong>
        <div class="semester-progress-bar"><span style="width:${pct}%"></span></div>
      </li>`;
  }).join("");
}

function renderMissionPanel() {
  const missionEl = document.getElementById("daily-mission");
  const progressEl = document.getElementById("mission-progress");
  if (!missionEl || !progressEl) return;

  const today = getDailyProgress();
  const opensDone = Math.min(3, today.openedFiles.length);
  const reviewsDone = Math.min(2, today.reviewedFiles.length);
  const totalDone = opensDone + reviewsDone;

  const weakestSemester = getWeakestSemester();
  if (weakestSemester) {
    missionEl.textContent = `Focus Orbit: Complete 1 review in Semester ${weakestSemester} and open 2 recent papers.`;
  } else {
    missionEl.textContent = "Open 3 papers and review 2 papers today.";
  }
  progressEl.textContent = `${totalDone} / 5 done`;
}

function getWeakestSemester() {
  if (papersData.length === 0) return null;
  const stats = papersData.reduce((map, paper) => {
    const sem = Number(paper.semester);
    if (!map[sem]) map[sem] = { total: 0, reviewed: 0 };
    map[sem].total += 1;
    if (isReviewed(paper.file)) map[sem].reviewed += 1;
    return map;
  }, {});

  const ranked = Object.entries(stats)
    .map(([sem, value]) => ({
      sem: Number(sem),
      ratio: value.total ? value.reviewed / value.total : 0
    }))
    .sort((a, b) => a.ratio - b.ratio);

  return ranked[0]?.sem || null;
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

fetchData();
