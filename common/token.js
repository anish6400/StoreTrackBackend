const jwt = require("jsonwebtoken");
const { jwtSecret } = require("./config.js");

exports.createToken = (data, exp) => {
  const token = jwt.sign(data, jwtSecret, { expiresIn: exp });
  return token;
};

exports.parseToken = () => {};
