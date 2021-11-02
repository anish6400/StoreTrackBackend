const jwt = require("jsonwebtoken");
const { jwtSecret } = require("./config.js");

exports.createToken = (data) => {
  const token = jwt.sign(data, jwtSecret, { expiresIn: "1h" });
  return token;
};

exports.parseToken = () => {};
