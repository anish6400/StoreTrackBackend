const mysql = require("mysql2/promise");
const { dbConfig } = require("../common/config.js");
const bcrypt = require("bcrypt");
const token = require("../common/token.js");

const { validEmail, strongPassword } = require("../common/utils.js");

// verify user credentials and give them access token
const login = async (req, res, next) => {
  // res data format
  let resData = {
    error: { email: null, password: null, server: false, message: null },
    success: { token: null, verified: true, message: null },
  };

  // store the body in input
  const input = req.body;

  // if email and passwords filds are empty or missing, return an error
  if (!input) {
    resData.error.message = "Invalid request. Body missing.";
    return res.status(400).send(resData);
  }
  if (!input.email || input.email === "") {
    resData.error.email = "Email field cannot be empty.";
    return res.status(400).send(resData);
  }
  if (!input.password || input.password === "") {
    resData.error.password = "Password field cannot be empty.";
    return res.status(400).send(resData);
  }

  // get user data related to that email
  const connection = await mysql.createConnection(dbConfig);
  let [rows] = await connection.execute(`SELECT * FROM users WHERE email = ?`, [
    input.email,
  ]);

  // if email is not present in records, return an error
  if (rows.length === 0) {
    resData.error.email = "This email not registered. Please signup instead.";
    return res.status(400).send(resData);
  }

  const userData = rows[0];

  // check if password is correct
  const authorized = bcrypt.compareSync(input.password, userData.password);
  if (!authorized) {
    resData.error.password = "This password is not correct. Please try agian.";
    return res.status(400).send(resData);
  }

  // if email is not verified, return a message to verify the email with the code just sent.
  if (!userData.verified) {
    // TODO:
    // make a request to verify the user
    resData.success.verified = false;
    resData.success.message =
      "A 6 digit code has been sent to your email address. Please verify your email address to continue.";
    return res.status(200).send(resData);
  }

  // if everything goes well, return the access token, containing email and password
  token.createToken({ email: userData.email, name: userData.name });
  res.success.token = token;
  res.success.message = `Successfully logged in as ${userData.name}`;
  return res.status(200).send(resData);
};

// get user credentials and add it to database
const signup = async (req, res) => {
  // res data format
  let resData = {
    error: {
      name: null,
      email: null,
      password: null,
      server: false,
      message: null,
    },
    success: { message: null },
  };

  // store the body in input
  const input = req.body;

  // if email and passwords filds are empty or invalid, return an error
  if (!input) {
    resData.error.message = "Invalid request. Body missing.";
    return res.status(400).send(resData);
  }
  if (!input.name || input.name === "") {
    resData.error.name = "Name field cannot be empty.";
    return res.status(400).send(resData);
  }
  if (!input.email || input.email === "") {
    resData.error.email = "Email field cannot be empty.";
    return res.status(400).send(resData);
  }
  if (!input.password || input.password === "") {
    resData.error.password = "Password field cannot be empty.";
    return res.status(400).send(resData);
  }

  // make sure email format is valid and password is not weak
  if (!validEmail(input.email)) {
    resData.error.email = "Invalid email format.";
    return res.status(400).send(resData);
  }
  if (!strongPassword(input.password)) {
    resData.error.password =
      "Weak password. Password must be atleast 8 character long containing lowercase, uppercase, numeric and special letters.";
    return res.status(400).send(resData);
  }

  // get user data related to that email
  const connection = await mysql.createConnection(dbConfig);
  let [rows] = await connection.execute(`SELECT * FROM users WHERE email = ?`, [
    input.email,
  ]);

  // if email is present in records, return an error
  if (rows.length !== 0) {
    resData.error.email =
      "This email is already registered. Please signup or use new email address.";
    return res.status(400).send(resData);
  }

  // hash the password
  const saltRounds = 10;
  const hashedPassword = bcrypt.hashSync(input.password, saltRounds);

  // store the info in database
  await connection.execute(
    `INSERT into users (email, name, password, verified) VALUES (?,?,?,0)`,
    [input.email, input.name, hashedPassword]
  );

  // TODO:
  // send verification code
};

// take user email, create 6 digit code, send it to their email and store it in database
const requestReset = (email, purpose) => {
  // email
  // resetPurpose
};

const verify = () => {
  // otp
};

const resetPassword = () => {
  // userId
  // newPassword
};

const deleteUser = () => {
  // userId
};

module.exports = {
  login,
  signup,
  requestReset,
  verify,
  resetPassword,
  deleteUser,
};
