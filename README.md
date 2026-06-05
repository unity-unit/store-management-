# Store Management System (SMS)

This project is a full-stack Store Management System for DAB Enterprise LTD, built with Node.js, React, and MySQL.

## Features

- User registration and login
- Stock in recording with item details and supplier
- Stock out recording with quantity tracking
- Stock summary showing current stock levels
- Tables for stock in and stock out history

## Setup

1. Create the database and tables in MySQL:
   - Run the SQL script in `backend/db.sql`
   - Example:
     ```sql
     SOURCE C:/Users/USER/store-management-system/backend/db.sql;
     ```

2. Copy `backend/.env.example` to `backend/.env` and update your database credentials.

3. Install backend dependencies:
   ```powershell
   cd C:\Users\USER\store-management-system\backend
   npm install
   ```

4. Start the backend server:
   ```powershell
   npm start
   ```

5. Install frontend dependencies:
   ```powershell
   cd C:\Users\USER\store-management-system\frontend
   npm install
   ```

6. Start the frontend app:
   ```powershell
   npm run dev
   ```

7. Open the web app at `http://localhost:5173`.

## Notes

- Backend API runs on `http://localhost:5000`
- Frontend expects the backend at `http://localhost:5000/api`
- The MySQL database name is `sms_db`
