const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'worktrack',
  waitForConnections: true,
  connectionLimit: 10, 
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
  connection.release(); 
});

module.exports = pool;