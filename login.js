document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    //  Demo login credentials (replace with real auth in backend)
    const adminUser = "admin";
    const adminPass = "12345";

    if (username === adminUser && password === adminPass) {
      alert(" Login successful!");
      window.location.href = "admin.html";
    } else {
      alert(" Invalid username or password");
    }
  });
});
