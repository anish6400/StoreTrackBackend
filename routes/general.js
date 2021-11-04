const mysql = require("mysql2/promise");
const { dbConfig } = require("../common/config");

exports.mailInDb = async (email) => {
  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.execute(`SELECT * from users WHERE email=?`, [
    email,
  ]);

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
};
