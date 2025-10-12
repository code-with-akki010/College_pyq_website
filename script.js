let papersData = [];

async function fetchData() {
  const response = await fetch("papers.json");
  papersData = await response.json();

  populateSemesters();
}

function populateSemesters() {
  const semesterSelect = document.getElementById("semester");
  let semesters = [...new Set(papersData.map(p => p.semester))];
  
  semesterSelect.innerHTML = "<option value=''>--Select Semester--</option>";
  semesters.forEach(s => {
    semesterSelect.innerHTML += `<option value="${s}">Semester ${s}</option>`;
  });

  semesterSelect.addEventListener("change", populateSubjects);
}

function populateSubjects() {
  const subjectSelect = document.getElementById("subject");
  const semester = document.getElementById("semester").value;

  let subjects = [...new Set(papersData.filter(p => p.semester == semester).map(p => p.subject))];

  subjectSelect.innerHTML = "<option value=''>--Select Subject--</option>";
  subjects.forEach(sub => {
    subjectSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
  });

  subjectSelect.addEventListener("change", populateCategories);
}

function populateCategories() {
  const categorySelect = document.getElementById("category");
  const semester = document.getElementById("semester").value;
  const subject = document.getElementById("subject").value;

  let categories = [...new Set(papersData.filter(p => p.semester == semester && p.subject == subject).map(p => p.category))];

  categorySelect.innerHTML = "<option value=''>--Select Category--</option>";
  categories.forEach(cat => {
    categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
  });

  categorySelect.addEventListener("change", populateYears);
}

function populateYears() {
  const yearSelect = document.getElementById("year");
  const semester = document.getElementById("semester").value;
  const subject = document.getElementById("subject").value;
  const category = document.getElementById("category").value;

  let years = [...new Set(papersData.filter(p => p.semester == semester && p.subject == subject && p.category == category).map(p => p.year))];

  yearSelect.innerHTML = "<option value=''>--Select Year--</option>";
  years.forEach(y => {
    yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
  });
}

function loadPapers() {
  const semester = document.getElementById("semester").value;
  const subject = document.getElementById("subject").value;
  const category = document.getElementById("category").value;
  const year = document.getElementById("year").value;

  const papersList = document.getElementById("papers");
  papersList.innerHTML = "";

  let results = papersData.filter(p => 
    p.semester == semester && p.subject == subject && p.category == category && p.year == year
  );

  if (results.length === 0) {
    papersList.innerHTML = "<li>No papers found.</li>";
  } else {
    results.forEach(r => {
      papersList.innerHTML += `<li><a href="${r.file}" target="_blank">${r.subject} - ${r.category} (${r.year})</a></li>`;
    });
  }
}

fetchData();
