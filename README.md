# 🎓 CampusBytes: The University Question Paper Vault

> **A smart, centralized platform for managing and accessing previous year university question papers.**

![HTML5](https://img.shields.io/badge/HTML5-orange?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-blue?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-yellow?logo=javascript&logoColor=black)
![JSON](https://img.shields.io/badge/JSON-lightgrey?logo=json&logoColor=black)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

---

## 🌟 About The Project

**CampusBytes** is a responsive front-end web application designed to simplify access to **Previous Year Question Papers** for Burdwan university students(Only Computer Science Students).  
It acts as a **digital archive**, allowing students to easily **filter and retrieve** question papers based on semester, subject, year, and category.

This repository includes all foundational **HTML**, **CSS**, and **JavaScript** files for both:
- 🧭 The **Student Portal**
- 🔐 A **Password-Protected Admin Dashboard**

> 🎯 **Goal:** Empower students with a fast, organized, and easy-to-use academic resource hub.

---

## 🚀 Key Features

| Feature | Description | File(s) |
| :--- | :--- | :--- |
| 🔍 **Dynamic Filtering** | Filter papers by **Semester**, **Subject**, **Category** (Internal/External/Practical), and **Year**. | `index.html` |
| 📂 **Centralized Data** | All question paper metadata is maintained in a single, easy-to-update **JSON file**. | `papers.json` |
| 🔑 **Admin Authentication** | Secure login for admin area to prevent unauthorized uploads. | `login.html`, `login.js` |
| ⬆️ **Paper Upload (Simulated)** | Upload form for new papers with proper data structure (semester, subject, year, file). | `admin.html`, `admin.js` |

---

## 🛠️ Tech Stack

Built entirely with **client-side technologies** — clean, lightweight, and dependency-free.

- 🧱 **HTML5**
- 🎨 **CSS3** (Dedicated styles for admin & login pages)
- ⚙️ **Vanilla JavaScript** (Filtering, login logic, and upload simulation)
- 📘 **JSON** (Data indexing for papers)
- 💎 **Font Awesome** (For icons and UI enhancement)

---

## ⚙️ Getting Started

Follow these steps to set up the project locally 👇

### 🧩 Prerequisites

- Any modern web browser (Chrome, Firefox, Edge,Brave)
- A **local web server** (recommended) to fetch `papers.json`:
  - Live Server (VS Code Extension)
  - Python HTTP Server (`python -m http.server`)
  - XAMPP / WAMP / MAMP

---

## 📝 Usage & Navigation

### 🎓 Student Portal (`index.html`)

Students can:

- Choose **Semester**, **Subject**, **Category**, and **Year**  
- Click **“Search Papers”** to view filtered results  
- The data is dynamically loaded from **`papers.json`**

---

### 🔐 Admin Dashboard (`admin.html`)

1. Open the **Login Page** → `login.html`  
2. Use the **Demo Credentials** (for testing only):

| Field | Value |
| :--- | :--- |
| **Username** | `admin` |
| **Password** | `12345` |

3. After successful login, you’ll be redirected to **`admin.html`**  
4. Use the **Upload Form** to simulate adding new question papers.

> ⚠️ **Note:** This version uses *simulated authentication*.  
> For real-world use, integrate a **secure backend system** (e.g., Firebase, Node.js, or PHP).

---

## 📂 Project Structure

📁 **CampusBytes/**  
│  
├── 🧩 **index.html** — 🎓 Student Interface  
├── 🔑 **login.html** — Admin Login Page  
├── ⚙️ **admin.html** — Admin Dashboard  
│  
├── 🧠 **login.js** — Handles admin login validation  
├── 🚀 **admin.js** — Handles paper upload simulation  
├── ⚡ **script.js** — Controls dynamic filtering and interactivity  
│  
├── 🎨 **style.css** — Main site styling  
├── 🖋️ **login.css** — Admin login styles  
├── 🧰 **admin.css** — Admin dashboard styles  
│  
├── 📘 **papers.json** — JSON data source (question paper metadata)  
└── 📄 **README.md** — Project documentation

---

## 👨‍💻 Author

Developed by: code-with-akki010

💬 Feel free to connect for collaborations or suggestions!

---
