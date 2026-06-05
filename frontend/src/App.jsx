import { useEffect, useState } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ user_name: '', password: '' });
  const [stockInForm, setStockInForm] = useState({ item_name: '', description: '', quantity_in: '', supplier_name: '', stock_in_date: '' });
  const [stockOutForm, setStockOutForm] = useState({ item_name: '', quantity_out: '', stock_out_date: '' });
  const [stockInRecords, setStockInRecords] = useState([]);
  const [stockOutRecords, setStockOutRecords] = useState([]);
  const [summary, setSummary] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const [inRes, outRes, summaryRes] = await Promise.all([
        api.get('/stock-in'),
        api.get('/stock-out'),
        api.get('/stock-summary'),
      ]);
      setStockInRecords(inRes.data);
      setStockOutRecords(outRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error(error);
      setMessage('Unable to load records. Is the backend running?');
    }
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      if (authMode === 'login') {
        const res = await api.post('/users/login', authForm);
        setUser(res.data.user);
        setMessage('Logged in successfully.');
      } else {
        await api.post('/users/register', authForm);
        setMessage('Registration successful. You can now log in.');
        setAuthMode('login');
      }
      setAuthForm({ user_name: '', password: '' });
    } catch (error) {
      setMessage(error.response?.data?.error || 'Authentication failed.');
    }
  };

  const handleStockInSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await api.post('/stock-in', { ...stockInForm, user_name: user?.user_name || 'guest' });
      setMessage('Stock in recorded.');
      setStockInForm({ item_name: '', description: '', quantity_in: '', supplier_name: '', stock_in_date: '' });
      fetchRecords();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Unable to record stock in.');
    }
  };

  const handleStockOutSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await api.post('/stock-out', { ...stockOutForm, user_name: user?.user_name || 'guest' });
      setMessage('Stock out recorded.');
      setStockOutForm({ item_name: '', quantity_out: '', stock_out_date: '' });
      fetchRecords();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Unable to record stock out.');
    }
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Store Management System</h1>
        <p>DAB Enterprise LTD inventory tracker</p>
      </header>

      {!user ? (
        <section className="card">
          <h2>{authMode === 'login' ? 'Login' : 'Register'}</h2>
          <form onSubmit={handleAuthSubmit}>
            <label>
              User Name
              <input
                type="text"
                value={authForm.user_name}
                onChange={(e) => setAuthForm({ ...authForm, user_name: e.target.value })}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                required
              />
            </label>
            <button type="submit">{authMode === 'login' ? 'Login' : 'Register'}</button>
          </form>
          <button className="secondary" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? 'Create an account' : 'Back to login'}
          </button>
          <p className="tip">Tip: create a user first, then record stock movements.</p>
        </section>
      ) : (
        <section className="card">
          <div className="user-bar">
            <strong>Signed in as {user.user_name}</strong>
            <button className="secondary" onClick={() => setUser(null)}>
              Logout
            </button>
          </div>
        </section>
      )}

      <div className="grid">
        <section className="card">
          <h2>Stock In</h2>
          <form onSubmit={handleStockInSubmit}>
            <label>
              Item Name
              <input
                type="text"
                value={stockInForm.item_name}
                onChange={(e) => setStockInForm({ ...stockInForm, item_name: e.target.value })}
                required
              />
            </label>
            <label>
              Description
              <input
                type="text"
                value={stockInForm.description}
                onChange={(e) => setStockInForm({ ...stockInForm, description: e.target.value })}
              />
            </label>
            <label>
              Quantity In
              <input
                type="number"
                min="1"
                value={stockInForm.quantity_in}
                onChange={(e) => setStockInForm({ ...stockInForm, quantity_in: e.target.value })}
                required
              />
            </label>
            <label>
              Supplier Name
              <input
                type="text"
                value={stockInForm.supplier_name}
                onChange={(e) => setStockInForm({ ...stockInForm, supplier_name: e.target.value })}
              />
            </label>
            <label>
              Stock In Date
              <input
                type="date"
                value={stockInForm.stock_in_date}
                onChange={(e) => setStockInForm({ ...stockInForm, stock_in_date: e.target.value })}
                required
              />
            </label>
            <button type="submit">Record Stock In</button>
          </form>
        </section>

        <section className="card">
          <h2>Stock Out</h2>
          <form onSubmit={handleStockOutSubmit}>
            <label>
              Item Name
              <input
                type="text"
                value={stockOutForm.item_name}
                onChange={(e) => setStockOutForm({ ...stockOutForm, item_name: e.target.value })}
                required
              />
            </label>
            <label>
              Quantity Out
              <input
                type="number"
                min="1"
                value={stockOutForm.quantity_out}
                onChange={(e) => setStockOutForm({ ...stockOutForm, quantity_out: e.target.value })}
                required
              />
            </label>
            <label>
              Stock Out Date
              <input
                type="date"
                value={stockOutForm.stock_out_date}
                onChange={(e) => setStockOutForm({ ...stockOutForm, stock_out_date: e.target.value })}
                required
              />
            </label>
            <button type="submit">Record Stock Out</button>
          </form>
        </section>
      </div>

      {message && <div className="message">{message}</div>}

      <section className="card">
        <h2>Stock Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Total In</th>
              <th>Total Out</th>
              <th>Current Stock</th>
            </tr>
          </thead>
          <tbody>
            {summary.length === 0 ? (
              <tr>
                <td colSpan="4">No stock summary available yet.</td>
              </tr>
            ) : (
              summary.map((row) => (
                <tr key={row.item_name}>
                  <td>{row.item_name}</td>
                  <td>{row.total_in}</td>
                  <td>{row.total_out}</td>
                  <td>{row.current_stock}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="grid">
        <section className="card">
          <h2>Stock In Records</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Total In</th>
                <th>Supplier</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {stockInRecords.length === 0 ? (
                <tr>
                  <td colSpan="7">No stock in records found.</td>
                </tr>
              ) : (
                stockInRecords.map((stock) => (
                  <tr key={stock.id}>
                    <td>{stock.stock_in_date}</td>
                    <td>{stock.item_name}</td>
                    <td>{stock.description}</td>
                    <td>{stock.quantity_in}</td>
                    <td>{stock.total_quantity_in}</td>
                    <td>{stock.supplier_name}</td>
                    <td>{stock.user_name || 'guest'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2>Stock Out Records</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Quantity</th>
                <th>Total Out</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {stockOutRecords.length === 0 ? (
                <tr>
                  <td colSpan="5">No stock out records found.</td>
                </tr>
              ) : (
                stockOutRecords.map((stock) => (
                  <tr key={stock.id}>
                    <td>{stock.stock_out_date}</td>
                    <td>{stock.item_name}</td>
                    <td>{stock.quantity_out}</td>
                    <td>{stock.total_quantity_out}</td>
                    <td>{stock.user_name || 'guest'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

export default App;
