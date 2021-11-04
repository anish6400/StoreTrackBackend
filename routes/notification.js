const mysql = require("mysql2/promise");
const { dbConfig } = require("../common/config.js");

exports.addNotification = async (storeId, email, text) => {
  const connection = await mysql.createConnection(dbConfig);
  const time = Date.now() / 1000;
  const [rows] = await connection.execute(
    `INSERT into notifications (storeId, email, createdAt, data) VALUES (?, ?, ?, ?)`,
    [storeId, email, time, text]
  );
};
