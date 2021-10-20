const cors = require("cors");
const express = require("express");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const config = require("./config.js");
const { validateEmail, validatePassword } = require("./utils.js");

const app = express();
app.use(cors());
const port = 5000;
const connection = mysql.createConnection({
  host: config.databaseHost,
  user: config.databaseUser,
  password: config.databasePassword,
  database: "work_structure",
});

connection.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});
// signup
// login
// verify
// resetPassword
// getStores
// addStore
// editStore
// deleteStore
// getProducts
// addProduct
// editProduct
// deleteProduct
// getOrders
// addOrder
// editOrder
// deleteOrder
// getTasks
// addTask
// editTask
// deleteTask
// getComments
// addComment
// editComment
// deleteComment
// getNotifications
//

app.get("/", function (req, res) {
  return res.send("Welcome to work structure backend");
});

// signup
app.post("/signup", function (req, res) {
  let fullname = req.query.fullname;
  let email = req.query.email;
  let password = req.query.password;

  // validating user inputs
  if (fullname === undefined || email === undefined || password === undefined) {
    return res.send({ error: "Missing parameters." }).status(400);
  }
  if (fullname === "" || email === "" || password === "") {
    return res.send({ error: "Fields cannot be empty." }).status(400);
  }
  if (!validateEmail(email)) {
    return res.send({ error: "Invalid email address." }).status(400);
  }
  if (!validatePassword(password)) {
    return res
      .send({
        error:
          "Password must contain atleast one uppercase letter, one lowercase letter, one special character and must be atleast 6 characters long.",
      })
      .status(400);
  }

  // verifying new user and storing in database
  connection.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    function (error, results, fields) {
      if (results.length !== 0) {
        return res
          .send({ error: "Account already exists. Please login instead." })
          .status(400);
      }
      hashPassword = bcrypt.hashSync(password, 10);
      connection.query(
        "INSERT INTO users (email, name, password, isVerified) VALUES (?, ?, ?, ?)",
        [email, fullname, hashPassword, 0],
        function (error, result) {
          if (error)
            return res.send({ error: "Unexpected error occured." }).status(500);
          connection.query(
            "SELECT * FROM users WHERE email = ?",
            [email],
            function (error, results, fields) {
              let userToken = jwt.sign(
                {
                  userId: results[0].userId,
                  email: results[0].email,
                  fullname: results[0].name,
                  isVerified: results[0].isVerified,
                },
                config.tokenSecret,
                { expiresIn: "1h" }
              );
              return res
                .send({
                  token: userToken,
                  message: "Account created successfully.",
                })
                .status(200);
            }
          );
        }
      );
    }
  );
});

// login
app.get("/login", function (req, res) {
  let email = req.query.email;
  let password = req.query.password;

  // validating user inputs
  if (email === undefined || password === undefined) {
    return res.send({ error: "Missing parameters." }).status(400);
  }
  if (email === "" || password === "") {
    return res.send({ error: "Fields cannot be empty." }).status(400);
  }
  if (!validateEmail(email)) {
    return res.send({ error: "Invalid email address." }).status(400);
  }

  // verifying user and send the auth token
  connection.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    function (error, results, fields) {
      if (error)
        return res.send({ error: "Unexpected error occured." }).status(500);
      if (results.length === 0) {
        return res
          .send({ error: "Account not registered. Please signup instead." })
          .status(400);
      }
      let authorized = bcrypt.compareSync(password, results[0].password);
      if (!authorized)
        return res
          .send({ error: "Incorrect Password. Please try again." })
          .status(400);
      let userToken = jwt.sign(
        {
          userId: results[0].userId,
          email: results[0].email,
          fullname: results[0].name,
          isVerified: results[0].isVerified,
        },
        config.tokenSecret,
        { expiresIn: "1h" }
      );
      return res
        .send({ token: userToken, message: "Login successfull." })
        .status(200);
    }
  );
});

// server listening at the port
app.listen(port, function () {
  console.log(`App listening at port number: ${port}`);
});
