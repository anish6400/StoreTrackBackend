const mysql = require("mysql2/promise");
const {
  dbConfig,
  emailConfig,
  siteUrl,
  jwtSecret,
  companyName,
} = require("../common/config.js");
const bcrypt = require("bcrypt");
const ProtonMail = require("protonmail-api");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const { validEmail, strongPassword } = require("../common/utils.js");

// verify user credentials and give them access token
const login = async (req, res) => {
  // res data format
  let resData = {
    error: { email: null, password: null, server: null, message: null },
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
    // make a request to verify the user
    try {
      await requestVerification(input.email, userData.name, false);
    } catch {
      resData.error.server = "Unexpcted error occured.";
      return res.status(500).send(resData);
    }
    resData.success.verified = false;
    resData.success.message = `A link has been sent to ${input.email}. Please click the link to verify your email.`;
    return res.status(200).send(resData);
  }

  // if everything goes well, return the access token, containing email and password
  let token = await jwt.sign(
    { email: userData.email, name: userData.name },
    jwtSecret,
    { expiresIn: "1h" }
  );
  resData.success.token = token;
  resData.success.message = `Successfully logged in as ${userData.name}`;
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
      server: null,
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

  // send verification
  try {
    await requestVerification(input.email, input.name, false);
  } catch {
    resData.error.server = "Unexpected error occured.";
    res.status(500).send(resData);
  }

  resData.success.message = `A link has been sent to ${input.email}. Please click the link to verify your email.`;
  return res.status(200).send(resData);
};

const requestPasswordReset = async (req, res) => {
  // res data format
  let resData = {
    error: {
      email: null,
      server: null,
      message: null,
    },
    success: { message: null },
  };

  // store the body in input
  const input = req.body;

  // if email field is empty or invalid, return an error
  if (!input) {
    resData.error.message = "Invalid request. Body missing.";
    return res.status(400).send(resData);
  }
  if (!input.email || input.email === "") {
    resData.error.email = "Email field cannot be empty.";
    return res.status(400).send(resData);
  }

  // make sure email format is valid
  if (!validEmail(input.email)) {
    resData.error.email = "Invalid email format.";
    return res.status(400).send(resData);
  }

  // get user data related to that email
  const connection = await mysql.createConnection(dbConfig);
  let [rows] = await connection.execute(`SELECT * FROM users WHERE email = ?`, [
    input.email,
  ]);

  // if email is not present in records, return an error
  if (rows.length === 0) {
    resData.error.email =
      "This email not registered. Failed to request password reset.";
    return res.status(400).send(resData);
  }

  // send verification
  const userData = rows[0];
  try {
    await requestVerification(input.email, userData.name, true);
  } catch {
    resData.error.server = "Unexpcted error occured.";
    return res.status(500).send(resData);
  }
  resData.success.message = `A link has been sent to ${input.email}. Please click the link to reset your password.`;
  return res.status(200).send(resData);
};

const verify = async (req, res) => {
  // res data format
  let resData = {
    error: {
      token: null,
      server: null,
      message: null,
    },
    success: { token: null, message: null },
  };

  // store the body in input
  const input = req.body;

  // if token is empty or invalid, return an error
  if (!input) {
    resData.error.message = "Invalid request. Body missing.";
    return res.status(400).send(resData);
  }
  if (!input.token || input.token === "") {
    resData.error.token = "Token passed is invalid.";
    return res.status(400).send(resData);
  }

  // check if token is not expired and present in database
  let token_data;
  try {
    token_data = await jwt.verify(input.token, jwtSecret);
  } catch {
    resData.error.token =
      "The token is either invalid or expired. Please request again.";
    return res.status(400).send(resData);
  }

  if (token_data.passwordReset) {
    resData.error.token =
      "The token is either invalid or expired. Please request again.";
    return res.status(400).send(resData);
  }

  const connection = await mysql.createConnection(dbConfig);
  let [rows] = await connection.execute(
    `SELECT * FROM token_store WHERE token = ?`,
    [input.token]
  );
  if (rows.length === 0) {
    resData.error.token =
      "The token is either invalid or expired. Please request again.";
    return res.status(400).send(resData);
  }

  // mark the user as verified and give them an access token
  await connection.execute(`UPDATE users SET verified=1 WHERE email=?`, [
    token_data.email,
  ]);
  await connection.execute(`DELETE FROM token_store WHERE token=?`, [
    input.token,
  ]);

  [rows] = await connection.execute(`SELECT * FROM users WHERE email = ?`, [
    token_data.email,
  ]);

  let userData = rows[0];

  let token = await jwt.sign(
    { email: userData.email, name: userData.name },
    jwtSecret,
    { expiresIn: "1h" }
  );
  resData.success.token = token;
  resData.success.message = `Account verified. Successfully logged in as ${userData.name}`;
  return res.status(200).send(resData);
};

const resetPassword = async (req, res) => {
  // res data format
  let resData = {
    error: {
      token: null,
      password: null,
      server: null,
      message: null,
    },
    success: { token: null, message: null },
  };

  // store the body in input
  const input = req.body;

  // if token or password is empty, invalid or weak, return an error
  if (!input) {
    resData.error.message = "Invalid request. Body missing.";
    return res.status(400).send(resData);
  }
  if (!input.token || input.token === "") {
    resData.error.token = "Token passed is invalid.";
    return res.status(400).send(resData);
  }
  if (!input.password || input.password === "") {
    resData.error.password = "Password field cannot be empty.";
    return res.status(400).send(resData);
  }
  if (!strongPassword(input.password)) {
    resData.error.password =
      "Weak password. Password must be atleast 8 character long containing lowercase, uppercase, numeric and special letters.";
    return res.status(400).send(resData);
  }

  // check if token is not expired and present in database
  let token_data;
  try {
    token_data = await jwt.verify(input.token, jwtSecret);
  } catch {
    resData.error.token =
      "The token is either invalid or expired. Please request again.";
    return res.status(400).send(resData);
  }

  if (!token_data.passwordReset) {
    resData.error.token =
      "The token is either invalid or expired. Please request again.";
    return res.status(400).send(resData);
  }

  const connection = await mysql.createConnection(dbConfig);
  let [rows] = await connection.execute(
    `SELECT * FROM token_store WHERE token = ?`,
    [input.token]
  );
  if (rows.length === 0) {
    resData.error.token =
      "The token is either invalid or expired. Please request again.";
    return res.status(400).send(resData);
  }

  // hash the password
  const saltRounds = 10;
  const hashedPassword = bcrypt.hashSync(input.password, saltRounds);

  // change the password and give them an access token
  await connection.execute(`UPDATE users SET password=? WHERE email=?`, [
    hashedPassword,
    token_data.email,
  ]);

  await connection.execute(`DELETE FROM token_store WHERE token=?`, [
    input.token,
  ]);

  [rows] = await connection.execute(`SELECT * FROM users WHERE email = ?`, [
    token_data.email,
  ]);

  let userData = rows[0];

  let token = await jwt.sign(
    { email: userData.email, name: userData.name },
    jwtSecret,
    { expiresIn: "1h" }
  );
  resData.success.token = token;
  resData.success.message = `Password resetted. Successfully logged in as ${userData.name}`;
  return res.status(200).send(resData);
};

const changePassword = async (req, res) => {
  let resData = {
    error: {
      oldPassword: null,
      newPassword: null,
      server: null,
      message: null,
    },
    success: { message: null },
  };
  const input = req.body;
  if (!input.oldPassword || input.oldPassword === "") {
    resData.error.oldPassword = "Old password field missing.";
    return res.status(400).send(resData);
  }
  if (!input.newPassword || input.newPassword === "") {
    resData.error.newPassword = "New password field missing.";
    return res.status(400).send(resData);
  }
  const authorized = bcrypt.compareSync(input.oldPassword, req.user.password);
  if (!authorized) {
    resData.error.oldPassword = "Password is incorrect.";
    return res.status(400).send(resData);
  }
  if (input.oldPassword === input.newPassword) {
    resData.error.message("New assword cannot be same as old password.");
    return res.status(400).send(resData);
  }
  if (!strongPassword(input.newPassword)) {
    resData.error.newPassword =
      "Weak password. Password must be atleast 8 character long containing lowercase, uppercase, numeric and special letters.";
    return res.status(400).send(resData);
  }
  const connection = await mysql.createConnection(dbConfig);
  // hash the password
  const saltRounds = 10;
  const hashedPassword = bcrypt.hashSync(input.newPassword, saltRounds);

  // change the password and give them an access token
  await connection.execute(`UPDATE users SET password=? WHERE email=?`, [
    hashedPassword,
    req.user.email,
  ]);
  resData.success.message = "Password changed successfully.";
  return res.status(200).send(resData);
};

const deleteUser = () => {
  // TODO:
};

module.exports = {
  login,
  signup,
  verify,
  requestPasswordReset,
  resetPassword,
  changePassword,
  deleteUser,
};

// take user email and purpose, create token with that email and purpose and save that token in database
const requestVerification = async (email, name, passwordReset) => {
  // create a token
  const token = await jwt.sign(
    { email: email, passwordReset: passwordReset },
    jwtSecret,
    { expiresIn: "15m" }
  );

  // save the token in database
  const connection = await mysql.createConnection(dbConfig);
  await connection.execute(`INSERT into token_store (token) VALUES (?)`, [
    token,
  ]);

  // send the token with email
  const emailSubject = passwordReset
    ? "Password reset request!"
    : "New user verification!";
  const emailBody = passwordReset
    ? "to reset your password."
    : "to verify your email.";

  const link = `http://${siteUrl}/verification/${token}`;

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: emailConfig,
  });

  let mailOptions = {
    from: emailConfig.user,
    to: "kumaranish0285@gmail.com",
    subject: emailSubject,
    html: `<html>
    <p>Hello ${name},</p>
   <p>Please click this <a href="${link}">link</a> ${emailBody}.</p>
   <p>Thanks,</p>
   <p>${companyName}</p>
   <p>Note: The link is only valid for 15 minutes.</p>
   </html>`,
  };

  await transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};
