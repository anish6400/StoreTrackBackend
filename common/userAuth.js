const jwt = require("jsonwebtoken");
const { jwtSecret, dbConfig } = require("./config");
const mysql = require("mysql2/promise");

module.exports = async (req, res, next) => {
  const resData = { error: { token: null, message: null } };
  const input = req.body;

  if (!input) {
    resData.error.message = "Invalid request. Body missing.";
    return res.status(400).send(resData);
  }
  if (!input.token || input.token === "") {
    resData.error.token = "Token filed missing.";
    return res.status(400).send(resData);
  }

  let token_data;
  try {
    token_data = await jwt.verify(input.token, jwtSecret);
  } catch {
    resData.error.token = "Unauthorized.";
    return res.status(400).send(resData);
  }

  const connection = await mysql.createConnection(dbConfig);
  let [rows] = await connection.execute(`SELECT * FROM users WHERE email=?`, [
    token_data.email,
  ]);

  if (rows.length === 0) {
    resData.error.message = "This user is not registered.";
    return res.status(400).send(resData);
  }

  let userData = rows[0];

  if (!userData.verified) {
    resData.error.message = "Account not verified.";
    return res.status(400).send(resData);
  }

  req.user = {
    email: userData.email,
    password: userData.password,
    name: userData.name,
  };
  return next();
};
