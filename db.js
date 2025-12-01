// db.js
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Tx1010021$",   // your MySQL Workbench password
  database: "localmusic",   // the DB you created in Workbench
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = {
  query(sql, params) {
    return pool.execute(sql, params);
  },
};
