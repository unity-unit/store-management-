const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const dbName = process.env.DB_NAME || 'sms_db';
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

let pool = mysql.createPool({
  ...dbConfig,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function initDatabase() {
  try {
    const rootConnection = await mysql.createConnection({ ...dbConfig, multipleStatements: true });
    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \\`${dbName}\\`;`);
    await rootConnection.end();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_name VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_in (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        quantity_in INT NOT NULL,
        total_quantity_in INT NOT NULL,
        supplier_name VARCHAR(255),
        stock_in_date DATE NOT NULL,
        user_id INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_out (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        quantity_out INT NOT NULL,
        total_quantity_out INT NOT NULL,
        stock_out_date DATE NOT NULL,
        user_id INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    console.log('MySQL database and tables initialized.');
  } catch (error) {
    console.error('Unable to initialize MySQL database:', error.message);
    console.error('Please ensure MySQL is installed and the credentials in .env are correct.');
  }
}

initDatabase();

app.get('/', (req, res) => {
  res.json({ message: 'SMS backend is running' });
});

app.post('/api/users/register', async (req, res) => {
  const { user_name, password } = req.body;
  if (!user_name || !password) {
    return res.status(400).json({ error: 'User name and password are required.' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE user_name = ?', [user_name]);
    if (existing.length) {
      return res.status(400).json({ error: 'User name already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (user_name, password) VALUES (?, ?)', [user_name, hashedPassword]);
    res.json({ message: 'Registration successful.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/api/users/login', async (req, res) => {
  const { user_name, password } = req.body;
  if (!user_name || !password) {
    return res.status(400).json({ error: 'User name and password are required.' });
  }

  try {
    const [rows] = await pool.query('SELECT id, user_name, password FROM users WHERE user_name = ?', [user_name]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    res.json({ user: { id: user.id, user_name: user.user_name } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

app.get('/api/stock-in', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT si.id, si.item_name, si.description, si.quantity_in, si.total_quantity_in, si.supplier_name, si.stock_in_date, u.user_name
       FROM stock_in si
       LEFT JOIN users u ON si.user_id = u.id
       ORDER BY si.stock_in_date DESC, si.id DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch stock in records.' });
  }
});

app.post('/api/stock-in', async (req, res) => {
  const { item_name, description, quantity_in, supplier_name, stock_in_date, user_name } = req.body;
  if (!item_name || !quantity_in || !stock_in_date) {
    return res.status(400).json({ error: 'Item name, quantity, and date are required.' });
  }

  try {
    const [[user]] = await pool.query('SELECT id FROM users WHERE user_name = ?', [user_name]);
    const [existing] = await pool.query('SELECT IFNULL(SUM(quantity_in), 0) AS total_in FROM stock_in WHERE item_name = ?', [item_name]);
    const totalQuantityIn = existing[0].total_in + Number(quantity_in);

    await pool.query(
      'INSERT INTO stock_in (item_name, description, quantity_in, total_quantity_in, supplier_name, stock_in_date, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [item_name, description, Number(quantity_in), totalQuantityIn, supplier_name, stock_in_date, user ? user.id : null]
    );
    res.json({ message: 'Stock in recorded successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to store stock in record.' });
  }
});

app.get('/api/stock-out', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT so.id, so.item_name, so.quantity_out, so.total_quantity_out, so.stock_out_date, u.user_name
       FROM stock_out so
       LEFT JOIN users u ON so.user_id = u.id
       ORDER BY so.stock_out_date DESC, so.id DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch stock out records.' });
  }
});

app.post('/api/stock-out', async (req, res) => {
  const { item_name, quantity_out, stock_out_date, user_name } = req.body;
  if (!item_name || !quantity_out || !stock_out_date) {
    return res.status(400).json({ error: 'Item name, quantity, and date are required.' });
  }

  try {
    const [[user]] = await pool.query('SELECT id FROM users WHERE user_name = ?', [user_name]);
    const [existingOut] = await pool.query('SELECT IFNULL(SUM(quantity_out), 0) AS total_out FROM stock_out WHERE item_name = ?', [item_name]);
    const totalQuantityOut = existingOut[0].total_out + Number(quantity_out);

    await pool.query(
      'INSERT INTO stock_out (item_name, quantity_out, total_quantity_out, stock_out_date, user_id) VALUES (?, ?, ?, ?, ?)',
      [item_name, Number(quantity_out), totalQuantityOut, stock_out_date, user ? user.id : null]
    );
    res.json({ message: 'Stock out recorded successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to store stock out record.' });
  }
});

app.get('/api/stock-summary', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT item_name,
              IFNULL(SUM(quantity_in), 0) AS total_in,
              IFNULL(SUM(quantity_out), 0) AS total_out,
              IFNULL(SUM(quantity_in), 0) - IFNULL(SUM(quantity_out), 0) AS current_stock
       FROM (
         SELECT item_name, quantity_in, 0 AS quantity_out FROM stock_in
         UNION ALL
         SELECT item_name, 0 AS quantity_in, quantity_out FROM stock_out
       ) AS combined
       GROUP BY item_name
       ORDER BY item_name`
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch stock summary.' });
  }
});

app.listen(PORT, () => {
  console.log(`SMS backend listening on http://localhost:${PORT}`);
});
