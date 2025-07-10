
# 🩸 Red Love-Blood Donation Management System - Backend

> 🧪 Admin credentials for testing (can be pre-added manually to database): 
> Email: `admin@admin.com`  
> Password: `123456@aA`

This is the backend server for the Blood Donation Management System. It provides RESTful APIs to manage users, blood donation requests, blog posts, and payment processing.

🔗 **Frontend Repository:** [Frontend GitHub](https://github.com/Hujaifa81/blood-donation-management-system-frontend)  
🔗 **Live Site:** [Visit Website](https://blood-donation-managemen-7ebd3.web.app/)

---

## 🚀 Features

- **Donation Request Management**: Create, update, delete, and moderate blood donation requests.
- **User Roles**: Admin, Donor, and Volunteer with role-based access control.
- **Donor Discovery**: Search donors by blood group, district, and upazila.
- **Blog Management**: Add, edit, publish, and delete blog posts.
- **Stripe Integration**: Secure donation system using Stripe payment gateway.
- **Authentication & Authorization**: JWT-based authentication, HTTP-only cookies, protected routes.

---

## 🛠 Tech Stack

- Node.js
- Express.js
- MongoDB Atlas
- JWT (JSON Web Tokens)
- Cookie Parser
- Stripe API
- CORS

---

## 📦 Installation Guide

### Prerequisites

- Node.js
- MongoDB Atlas account
- Stripe account

### Steps

1. **Clone the backend repository:**
   ```bash
   git clone https://github.com/Hujaifa81/blood-donation-management-system-backend.git
   cd blood-donation-management-system-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file in the root directory:**
   ```env
   PORT=5000
   DB_USERNAME=your_db_username
   DB_PASSWORD=your_db_password
   JWT_SECRET=your_jwt_secret
   PAYMENT_SECRET_KEY=your_stripe_secret_key
   NODE_ENV=development
   ```

4. **Run the server:**
   ```bash
   node index.js
   ```

---

## 🧪 Testing

- Use Postman or a connected frontend to test the following routes:
  - `POST /users/:email`
  - `GET /users`
  - `POST /donationRequests/:email`
  - `GET /donationRequests`
  - `POST /blogs`
  - `GET /blogs`
  - `POST /funding`
  - `POST /create-payment-intent`


---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
