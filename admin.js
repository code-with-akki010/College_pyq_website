document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const semester = document.getElementById("semester").value;
    const subject = document.getElementById("subject").value.trim();
    const category = document.getElementById("category").value;
    const year = document.getElementById("year").value;
    const file = document.getElementById("file").files[0];

    if (!semester || !subject || !category || !year || !file) {
      alert(" Please fill in all fields and select a file.");
      return;
    }

    // For now, just simulate upload (since no backend yet)
    alert(` File "${file.name}" uploaded for Semester ${semester}, ${subject}, ${category} (${year})`);

    // Reset form after upload
    form.reset();
  });
});
