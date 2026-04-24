# 🎓 CampusBytes: The University Question Paper Vault

> **A smart, centralized platform for managing and accessing previous year university question papers.**

![HTML5](https://img.shields.io/badge/HTML5-orange?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-blue?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-yellow?logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-green?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-lightgrey?logo=express&logoColor=black)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

---

## 🌟 About The Project

**CampusBytes** is a responsive web application designed to simplify access to **Previous Year Question Papers** for Burdwan university students (Only Computer Science Students).  
It acts as a **digital archive**, allowing students to easily **filter and retrieve** question papers based on semester, subject, year, and category.

This repository includes both a **Student Portal** and a **Password-Protected Admin Dashboard** with a **Node.js/Express backend** to handle real PDF uploads and automatic database management.

> 🎯 **Goal:** Empower students with a fast, organized, and easy-to-use academic resource hub.

---

## 🚀 Key Features

| Feature | Description | File(s) |
| :--- | :--- | :--- |
| 🔍 **Dynamic Filtering** | Filter papers by **Semester**, **Subject**, **Category** (Internal/External/Practical), and **Year**. | `index.html`, `script.js` |
| 🤖 **Automated Data Indexing** | The server auto-scans uploaded PDFs and regenerates `papers.json` automatically. No manual data entry needed! | `server.js` |
| 🔑 **Admin Authentication** | Secure login for the admin area to prevent unauthorized uploads. | `login.html`, `login.js` |
| ⬆️ **Real PDF Uploads** | Upload form for new papers that saves files locally and manages the database. | `admin.html`, `admin.js`, `server.js` |

---

## 🛠️ Tech Stack

- **Frontend:**
  - 🧱 **HTML5** & 🎨 **CSS3** (Fully responsive, mobile-friendly design)
  - ⚙️ **Vanilla JavaScript** (Dynamic filtering and UI logic)
  - 💎 **Font Awesome** (Icons)
- **Backend:**
  - 🟢 **Node.js** & **Express** (API and server logic)
  - 📦 **Multer** (Handling file uploads)
  - 📘 **JSON** (Auto-generated database)

---

## ⚙️ Getting Started

Follow these steps to set up the project and run the server locally 👇

### 🧩 Prerequisites

- Any modern web browser (Chrome, Firefox, Edge, Brave)
- [Node.js](https://nodejs.org/) installed on your computer.

### 🚀 Installation & Running

1. Clone the repository:
   ```bash
   git clone https://github.com/code-with-akki010/College_pyq_website.git
   cd College_pyq_website
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser and go to `http://localhost:3000`

---

## 📝 Usage & Navigation

### 🎓 Student Portal (`http://localhost:3000`)

Students can:

- Choose **Semester**, **Subject**, **Category**, and **Year**  
- Click **“Search Papers”** to view filtered results  
- The data is dynamically loaded from the live API (`/api/papers`).

---

### 🔐 Admin Dashboard (`http://localhost:3000/login.html`)

1. Open the **Login Page**  
2. Use the **Credentials**:

| Field | Value |
| :--- | :--- |
| **Username** | `5min_topper` |
| **Password** | `Luck@100` |

3. After successful login, you’ll be redirected to **`admin.html`**  
4. Use the **Upload Form** to add new question papers (PDFs). They will be saved to the `papers/` folder and instantly available on the main site.

> ⚠️ **Note:** The login mechanism uses client-side validation for demonstration. For production use, authentication should be moved to the backend.

---

## 📂 Project Structure

📁 **College_pyq_website/**  
│  
├── ⚙️ **server.js** — Express backend (Uploads & API)
├── 📦 **package.json** — Node.js dependencies
│
├── 🧩 **index.html** — 🎓 Student Interface  
├── 🔑 **login.html** — Admin Login Page  
├── 🛠️ **admin.html** — Admin Dashboard  
│  
├── 🧠 **login.js** — Handles admin login validation  
├── 🚀 **admin.js** — Handles paper upload to the server  
├── ⚡ **script.js** — Controls dynamic filtering and API fetching  
│  
├── 🎨 **style.css** — Main site styling  
├── 🖋️ **login.css** — Admin login styles  
├── 🧰 **admin.css** — Admin dashboard styles  
│  
├── 📁 **papers/** — Directory where uploaded PDFs are stored
├── 📘 **papers.json** — Auto-generated metadata for all papers
└── 📄 **README.md** — Project documentation

---

## 🌐 Live Demo & Hosting

This project uses a split hosting architecture to work on the live internet:

- **Frontend (Static UI):** Hosted on [GitHub Pages](https://code-with-akki010.github.io/College_pyq_website/)
- **Backend (Node.js API):** Hosted on [Render](https://college-pyq-website-1.onrender.com)

<p align="left">
  <a href="https://code-with-akki010.github.io/College_pyq_website/" target="_blank">
    🔗 <strong>Visit the Live Student Portal →</strong>  
  </a>
</p>

> ⚠️ **Important Note on Free Hosting:** Because the backend is hosted on a free Render instance, the server goes to "sleep" after 15 minutes of inactivity. When it wakes up, it wipes its temporary storage. This means any **new PDFs** uploaded via the live admin panel will be lost after a restart. To permanently save PDFs, they must be pushed directly to the `papers/` folder in the GitHub repository!

---

## 👨‍💻 Author

Developed by: **code-with-akki010**

💬 Feel free to connect for collaborations or suggestions!

---

