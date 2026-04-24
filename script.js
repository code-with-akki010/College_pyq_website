const API = "http://localhost:3000";
let papersData = [];

async function fetchData() {
  try {
    const res  = await fetch(`${API}/api/papers`);
    papersData = await res.json();
    populateSemesters();
  } catch {
    document.getElementById("papers").innerHTML =
      "<li style='color:#f87171'>⚠️ Cannot reach server. Please start server.js first.</li>";
  }
}

function populateSemesters() {
  const sel = document.getElementById("semester");
  const semesters = [...new Set(papersData.map(p => p.semester))].sort((a,b)=>a-b);

  sel.innerHTML = "<option value=''>--Select Semester--</option>";
  semesters.forEach(s => {
    sel.innerHTML += `<option value="${s}">Semester ${s}</option>`;
  });

  sel.addEventListener("change", populateSubjects);
}

function populateSubjects() {
  const semester = document.getElementById("semester").value;
  const sel      = document.getElementById("subject");

  const subjects = [...new Set(
    papersData.filter(p => p.semester == semester).map(p => p.subject)
  )].sort();

  sel.innerHTML = "<option value=''>--Select Subject--</option>";
  subjects.forEach(sub => {
    sel.innerHTML += `<option value="${sub}">${sub}</option>`;
  });

  sel.addEventListener("change", populateCategories);
}

function populateCategories() {
  const semester = document.getElementById("semester").value;
  const subject  = document.getElementById("subject").value;
  const sel      = document.getElementById("category");

  const categories = [...new Set(
    papersData
      .filter(p => p.semester == semester && p.subject == subject)
      .map(p => p.category)
  )].sort();

  sel.innerHTML = "<option value=''>--Select Category--</option>";
  categories.forEach(cat => {
    sel.innerHTML += `<option value="${cat}">${cat}</option>`;
  });

  sel.addEventListener("change", populateYears);
}

function populateYears() {
  const semester = document.getElementById("semester").value;
  const subject  = document.getElementById("subject").value;
  const category = document.getElementById("category").value;
  const sel      = document.getElementById("year");

  const years = [...new Set(
    papersData
      .filter(p => p.semester == semester && p.subject == subject && p.category == category)
      .map(p => p.year)
  )].sort((a,b)=>b-a);

  sel.innerHTML = "<option value=''>--Select Year--</option>";
  years.forEach(y => {
    sel.innerHTML += `<option value="${y}">${y}</option>`;
  });
}

function loadPapers() {
  const semester = document.getElementById("semester").value;
  const subject  = document.getElementById("subject").value;
  const category = document.getElementById("category").value;
  const year     = document.getElementById("year").value;
  const list     = document.getElementById("papers");

  list.innerHTML = "";

  const results = papersData.filter(p =>
    p.semester == semester &&
    p.subject  == subject  &&
    p.category == category &&
    p.year     == year
  );

  if (results.length === 0) {
    list.innerHTML = "<li>No papers found for this selection.</li>";
  } else {
    results.forEach(r => {
      list.innerHTML += `
        <li>
          <a href="${API}/${r.file}" target="_blank">
            <i class="fa-solid fa-file-pdf"></i>
            ${r.subject} — ${r.category} (${r.year})
          </a>
        </li>`;
    });
  }
}

fetchData();

