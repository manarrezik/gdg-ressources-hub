# 📘 GDG Resource Hub – API Documentation

**Base URL:** `/api/v1`  
**Authentication:** JWT (Bearer Token)  
**Roles:**  
- 🧍‍♀️ `visitor` – can browse and view  
- 👥 `member` – can add/edit own content  
- 🧑‍💼 `co-manager` – full admin access  

---

## 🔐 Authentication

### **POST /auth/register**
Register a new user.  
Default role = `visitor`.

**Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securePassword123",
  "department": "66f28c..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully as a Visitor",
  "data": {
    "user": { "_id": "...", "name": "Jane Doe", "role": "visitor" },
    "token": "JWT_TOKEN"
  }
}
```

---

### **POST /auth/login**
Login and receive a JWT token.

**Body:**
```json
{ "email": "jane@example.com", "password": "securePassword123" }
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "_id": "...", "name": "Jane Doe", "role": "visitor" },
    "token": "JWT_TOKEN"
  }
}
```

---

### **GET /auth/me**
Get logged-in user profile.  
🔒 **Access:** Authenticated users (any role)

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "success": true,
  "data": { "_id": "...", "name": "Jane Doe", "role": "visitor" }
}
```

---

## 👥 User Management

**Base Route:** `/users`  
🔒 **Access:**  
- `co-manager` → Full CRUD  
- User → Can view their own profile only

---

### **POST /users/**
Create new user.  
🔒 **Access:** `co-manager` only

**Body:**
```json
{
  "name": "New Member",
  "email": "member@example.com",
  "password": "Password123",
  "role": "member",
  "department": "66f..."
}
```

---

### **GET /users/**
Get all users.  
🔒 **Access:** `co-manager` only

---

### **GET /users/:id**
Get user by ID.  
🔒 **Access:** `self` or `co-manager`

---

### **PUT /users/:id**
Update user details.  
🔒 **Access:** `co-manager`

---

### **PUT /users/:id/password**
Update user password.  
🔒 **Access:** `co-manager`

---

### **DELETE /users/:id**
Soft delete user.  
🔒 **Access:** `co-manager`

---

### **GET /users/:id/stats**
Get user statistics (uploads, favorites, etc).  
🔒 **Access:** `co-manager`

---

### **GET /users/:id/resources**
List user resources.  
🔒 **Access:** `co-manager` or resource owner

---

## 🏢 Department Management

**Base Route:** `/departments`  
🔒 **Access:**  
- `co-manager` → Full CRUD  
- Everyone → Read only

---

### **POST /departments/**
Create department  
🔒 `co-manager`

---

### **GET /departments/**
Get all departments  
🔓 Public

---

### **GET /departments/:id**
Get department by ID  
🔓 Public

---

### **PUT /departments/:id**
Update department  
🔒 `co-manager`

---

### **DELETE /departments/:id**
Soft delete department  
🔒 `co-manager`

---

### **GET /departments/:id/stats**
Get department stats (folders, resources count)  
🔒 `co-manager`

---

## 📁 Folder Management

**Base Route:** `/folders`  
🔒 **Access:**  
- `co-manager` → Full CRUD  
- `member` → Read, create, update own  
- `visitor` → Read only

---

### **POST /folders/**
Create folder  
🔒 `member`, `co-manager`

**Body:**
```json
{
  "name": "Web Development",
  "department": "66f28c..."
}
```

---

### **GET /folders/**
Get all folders  
🔓 Public

---

### **GET /folders/department/:departmentId**
Get folders under specific department  
🔓 Public

---

### **GET /folders/:id**
Get folder by ID  
🔓 Public

---

### **PUT /folders/:id**
Update folder  
🔒 `member` (own folder) or `co-manager`

---

### **DELETE /folders/:id**
Soft delete folder  
🔒 `co-manager`

---

### **GET /folders/:id/stats**
Get folder statistics  
🔒 `co-manager`

---

### **GET /folders/:id/resources**
Get all resources in folder  
🔓 Public

---

## 📚 Resource Management

**Base Route:** `/resources`  
🔒 **Access:**  
- `visitor` → Can view & download  
- `member` → Can add/edit own resources  
- `co-manager` → Full access  

---

### **GET /resources/**
Get all resources (supports filters)  
🔓 Public

---

### **GET /resources/:id**
Get resource details by ID  
🔓 Public

---

### **POST /resources/**
Create resource (with file upload)  
🔒 `member`, `co-manager`

**Form Data:**
```
file: <uploaded_file>
title: "Intro to React"
description: "Beginner-friendly guide"
folder: "66f..."
```

---

### **PUT /resources/:id**
Update resource  
🔒 `member` (own resource) or `co-manager`

---

### **DELETE /resources/:id**
Soft delete resource  
🔒 `co-manager`

---

### **PATCH /resources/:id/add-files**
Add multiple files to resource  
🔒 `member` (own) or `co-manager`

---

### **DELETE /resources/:id/remove-file/:fileId**
Remove file from resource  
🔒 `member` (own) or `co-manager`

---

### **POST /resources/:id/download**
Track resource download (increments counter)  
🔓 Public

---

### **POST /resources/:id/favorite**
Toggle favorite resource  
🔒 Logged in user

---

### **GET /resources/stats**
Get global resource stats  
🔒 `co-manager`

---

## ⚙️ Error Responses

| Code | Meaning | Example |
|------|----------|---------|
| 400 | Bad Request | `{ "message": "Missing required fields" }` |
| 401 | Unauthorized | `{ "message": "Not authorized, token missing" }` |
| 403 | Forbidden | `{ "message": "Forbidden: insufficient permissions" }` |
| 404 | Not Found | `{ "message": "Resource not found" }` |
| 500 | Server Error | `{ "message": "Internal Server Error" }` |

---

## 🧩 Authentication Middleware Summary

### `protect`
Ensures user is logged in by verifying JWT in `Authorization` header.  
Attaches decoded user info to `req.user`.

### `restrictTo(...roles)`
Restricts access to specific roles (e.g. `co-manager`, `member`).  
Returns 403 if user’s role is not in allowed list.

---

## 📦 Token Structure

```json
{
  "id": "66f28c...",
  "role": "member",
  "iat": 1730497021,
  "exp": 1731101821
}
```

Use in header:
```
Authorization: Bearer <token>
```

---

## 🧱 Project Structure (Backend)

```
backend/
│
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── departmentController.js
│   ├── folderController.js
│   └── resourceController.js
│
├── middleware/
│   ├── asyncHandler.js
│   ├── authMiddleware.js
│   └── multer.js
│
├── models/
│   ├── User.js
│   ├── Department.js
│   ├── Folder.js
│   └── Resource.js
│
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── departmentRoutes.js
│   ├── folderRoutes.js
│   └── resourceRoutes.js
│
└── utils/
    └── tokenGenerator.js
```

---

### ✅ Version
**API Version:** v1  
**Last Updated:** November 2025  
**Maintained by:** OMC Club – GDG Resource Hub Team

---
