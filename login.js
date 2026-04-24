document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    //  Demo login credentials (replace with real auth in backend)
    const adminUser = "5min_topper";
    const adminPass = "Luck@100";

    if (username === adminUser && password === adminPass) {
      alert(" Login successful!");
      window.location.href = "admin.html";
    } else {
      alert(" Invalid username or password");
    }
  });
});
