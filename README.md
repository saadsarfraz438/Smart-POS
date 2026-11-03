# LumenSoft Point of Sale (POS) System

A modern, fast, and secure Point of Sale (POS) application designed to streamline retail operations. This system automates checkout processes, tracks inventory in real-time, manages salespersons, and generates detailed sales analytics,the application is built using modern web technologies including React.js for the frontend, ASP.NET Core Web API for the backend, and SQL Server for database management.
It Includes 
* **Dashboard:** Rich business overview metrics.
* **Dual Panels:** Separate, dedicated interfaces for Admins and Salespersons.
* **Multi-Session Handling:** Run Admin and Sales sessions concurrently in the same browser without state collision.
* **Role-Based Route Guarding:** Secure frontend routes to prevent unauthorized panel access.
* **Product Management:** Complete CRUD operations for the inventory.
* **Salesperson Management:** Complete CRUD operations for staff records.
* **Point of Sale (POS):** Fast checkout interface with product search and autocomplete features.
* **Sales Records:** Log, view, and audit past transactions.
* **Receipt Generation:** Print or save structured digital purchase receipts.
* **Notifications:** Sweet Alert Notifications.
* **Security & Validation:** Secure REST API integration, robust frontend form validation via React Hook Form, and backend role validation.
* **UX Enrichments:** Responsive Bootstrap UI, dark mode toggle, and SweetAlert2 notifications.

---
## Test System:
* To enter or test the system, login by using following **Admin credentials**.
 * Email: 👉 **admin@lumensoft.com** 👈
 * Password: 👉 **Admin@12345** 👈
 * It take 1 minute to login due to cold start
* Enter the admin panel ,create the demo salesperson in salesperson screen.
* set email and password for salesperson.
* Go to login page  enter to salesperson panel by login using email and password you gave for demo salesperson.
  
 [![Typing SVG](https://readme-typing-svg.demolab.com/?lines=Click+on+LinkButton+👇;To+Enter+POS-System👇)](https://git.io/typing-svg)
 
 [![POS-System](https://img.shields.io/badge/View%20POINT_OF_SALE-Click%20HERE-0A66C2?style=for-the-badge&logo=github&logoColor=white)](https://pos.sses.dev/)

---

This workspace is split into two top-level folders:

- [frontend](frontend) contains the Vite React app.
- [backend](backend) contains the ASP.NET Core API project.

---

## Features

- Dashboard with business overview
- Multi-Session Handling
- Role-Based Route Guarding
- Product Management (CRUD)
- Salesperson Management (CRUD)
- Point of Sale (POS)
- Sales Records
- Product Search & AutoComplete
- Generate receipt 
- REST API Integration
- SQL Server Database
- Responsive Bootstrap UI
- Form Validation
- DarkMode function
- Login & Logout feature (Admin and SalesPersons)

## Tech Stack

### Frontend
- React.js
- HTML&CSS
- TypeScript
- Bootstrap 5
- React Router
- Axios
- React Hook Form
- SweetAlert2

### Backend
- ASP.NET Core Web API
- C #
- Entity Framework Core
- Repository Pattern
- REST API

### Database
- Microsoft Azure
- Microsoft SQL Server

---

## Project Structure
```
Pos-system/

Frontend/
 src/
├── assets/                  # Static files (images, icons, logos)
├── components/              # Reusable global UI (Button, Modal, Card, Table)
├── features/                # Feature-based modules
│   └── sales/
│       ├── components/      # Sales/POS-specific UI
│       ├── hooks/           # Custom hooks
│       ├── services/        # API calls for sales
│       └── utils/           # Sales helpers
├── hooks/                   # Global custom hooks
├── layouts/                 # App shell and navigation
├── pages/                   # Main views (Dashboard, Products, POS, Settings)
├── routes/                  # Route configuration
├── services/                # Global API setup
├── styles/                  # Global CSS
├── utils/                   # Shared helper functions
├── App.jsx                  # Root component
└── main.jsx                 # Entry point

backend/
└── LumensoftPosApi/
    ├── LumensoftPosApi.csproj          # Dependencies, and target framework (.NET 10)
    ├── Program.cs                      # Application entry point
    ├── Models.cs                       # Data models and Entity Framework entities
    ├── appsettings.json                # Global configuration settings
    ├── appsettings.Development.json    # Development configuration overrides
    ├── Data/
    │   └── LumensoftDbContext.cs       # Entity Framework Core database context mapper
    ├── launchSettings.json         # Server profiles, ports (HTTP/HTTPS), and IIS configuration
    ├── bin/                            # Compiled machine code
    └── obj/                            # Intermediate build artifacts and NuGet package restoration caches
        ├── LumensoftPosApi.csproj.nuget.dgspec.json
        ├── LumensoftPosApi.csproj.nuget.g.props
        ├── LumensoftPosApi.csproj.nuget.g.targets
        ├── project.assets.json
        └── project.nuget.cache     
```

---

## Run It
```
git clone https://github.com/saadsarfraz438
cd POS-System

```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend/LumensoftPosApi
dotnet run
```

---

## Functioning:
Login Page for Admin and Salesperson

![App Screenshot](frontend/assets/login%20page%201.png)

Admin Dashboard
![App Screenshot](frontend/assets/2.png)

Product Screen
![App Screenshot](frontend/assets/3.png)

Salesperson Screen
![App Screenshot](frontend/assets/4.png)

Point of Sale Screen
![App Screenshot](frontend/assets/5.png)

SalesRecord Screen
![App Screenshot](frontend/assets/6.png)

Settings
![App Screenshot](frontend/assets/7.png)


Salesperson Screen for POS 
![App Screenshot](frontend/assets/9.png)

Receipt printing option
![App Screenshot](frontend/assets/10.png)

---

## Upgarded Features

### Multi-Session Role Authentication System

### 1. Dual-Session Storage Prefixing
* **Admin Session:** Stored under admin_token
* **Sales Session:** Stored under sales_token

### 2. Isolated Logout Logic

* Clicking **Logout** on the Salesperson dashboard clears only sales_token.
* The admin_token remains intact, preserving the administrator's active session in other tabs.

### 3. Strict Role-Based Route Guarding

* **Targeted Token Check:** Accessing /admin/* routes strictly validates the existence and integrity of admin_token.
* **Contextual Redirection:** If a user with an active sales_token attempts to access an administrative link, the guard intercepts the request and redirects them to the /admin/login prompt rather than exposing the dashboard.

### Route Guard Pseudo-Logic

### Alternative Testing Strategies

* **Incognito/Private Windows:** Open the salesperson dashboard in a private window to create a separate cookie jar.
* **Cross-Browser Testing:** Use separate browser engines (e.g., Google Chrome for Admin tasks and Mozilla Firefox for Sales tasks).

---

## Purpose

The purpose of this project is to demonstrate full-stack development skills by implementing CRUD operations, REST API communication, responsive UI design, and SQL database integration in a real-world POS system.

---

Developed as part of the Lumensoft Technologies Evaluation.

---
# React + TypeScript + Vite
---
## Deployement:
### Future Deployment
```
Frontend on Vercel (Completed)
Backend and Database on Railway (completed)
Databse on Azure (Completed)
Custom Domain (Completed)

```
### Future Improvement:


## Contributing
Contributions, suggestions, and feature requests are welcome. Feel free to fork the repository, create a new branch, and submit a pull request.

---

## License

This project is licensed under the ![MIT License](https://img.shields.io/badge/MIT-License-blue?style=for-the-badge&logo=MIT-License)

---

### support
- GitHub Issues - Bug reports and feature requests
- GitHub Discussions - Questions and community chat
- Reach out via:
  
[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:saadsarfraz.se@gmail.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-blue?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/saad-sarfraz-389450350/)
[![Twitter / X](https://img.shields.io/badge/X-black?style=for-the-badge&logo=x)](https://x.com/Saadsarfraz438)
