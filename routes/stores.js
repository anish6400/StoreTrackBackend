const { dbConfig } = require("../common/config");
const { mailInDb } = require("./general");
const mysql = require("mysql2/promise");
const { addNotification } = require("./notification");

exports.addStore = async (req, res) => {
  let resData = {
    error: { name: null, message: null },
    success: { message: null },
  };
  const name = req.body.name;
  const description = req.body.description ? req.body.description : "";
  const linkedUsers = req.body.linked_users;
  if (!name || name === "") {
    resData.error.name = "Name field cannot be empty.";
    return res.status(400).send(resData);
  }
  let usersPresent = true;
  for (let user of linkedUsers) {
    let email = user.email;
    if ((await mailInDb(email)) === null) {
      usersPresent = false;
      resData.error[email] = "No account registered with this email.";
    }
  }
  if (!usersPresent) {
    return res.status(400).send(resData);
  }
  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.execute(
    `INSERT into stores (name, description, createdBy) VALUES (?, ?, ?)`,
    [name, description, req.user.email]
  );
  for (let user of linkedUsers) {
    let email = user.email;
    let admin = user.isAdmin ? 1 : 0;
    await connection.execute(
      `INSERT into store_users (storeId, userEmail, admin) VALUES (?, ?, ?)`,
      [rows.insertId, email, admin]
    );
    if (email !== req.user.email) {
      await addNotification(
        rows.insertId,
        email,
        `${req.user.name} add you to their newly created store.`
      );
    }
  }
  await addNotification(
    rows.insertId,
    req.user.email,
    `You created store named ${name}.`
  );
  resData.success.message = "Store created successfully.";
  return res.status(200).send(resData);
};

exports.editStore = async (req, res) => {
  let resData = {
    error: { name: null, message: null },
    success: { message: null },
  };
  const storeId = req.body.storeId;
  const name = req.body.name;
  const description = req.body.description ? req.body.description : "";
  const linkedUsers = req.body.linked_users;
  const connection = await mysql.createConnection(dbConfig);
  const [role] = await connection.execute(
    `SELECT * FROM store_users WHERE storeId = ? & userEmail = ?`,
    [storeId, req.user.email]
  );
  if (role.length === 0 || role[0].isAdmin === 0) {
    resData.error.message = "Unprevileged.";
    return res.status(400).send(resData);
  }
  if (!name || name === "") {
    resData.error.name = "Name field cannot be empty.";
    return res.status(400).send(resData);
  }
  if (!storeId || storeId === "") {
    resData.error.message = "StoreId needs to be passed.";
    return res.status(400).send(resData);
  }
  let usersPresent = true;
  for (let user of linkedUsers) {
    let email = user.email;
    if ((await mailInDb(email)) === null) {
      usersPresent = false;
      resData.error[email] = "No account registered with this email.";
    }
  }
  if (!usersPresent) {
    return res.status(400).send(resData);
  }
  const [rows] = await connection.execute(
    `UPDATE stores SET name=?, description=? WHERE storeId=?`,
    [name, description, storeId]
  );
  for (let user of linkedUsers) {
    let email = user.email;
    let admin = user.isAdmin ? 1 : 0;
    await connection.execute(
      `INSERT into store_users (storeId, userEmail, admin) VALUES (?, ?, ?)`,
      [rows.insertId, email, admin]
    );
    if (email !== req.user.email) {
      await addNotification(
        rows.insertId,
        email,
        `${req.user.name} made some changes in store information.`
      );
    }
  }
  await addNotification(
    rows.insertId,
    req.user.email,
    `You made some changes in store information.`
  );
  resData.success.message = "Changes made successfully.";
  return res.status(200).send(resData);
};

exports.deleteStore = () => {
  // userId
  // storeId
  // TODO:
};

exports.getStore = async (req, res) => {
  let resData = {
    error: { message: null },
    success: { data: null, message: null },
  };
  const connection = await mysql.createConnection(dbConfig);
  const storeId = req.params.storeId;
  if (!storeId || storeId === "") {
    resData.error.message = "StoreId needs to be passed.";
    return res.status(400).send(resData);
  }
  const [role] = await connection.execute(
    `SELECT * FROM store_users WHERE storeId = ? & userEmail = ?`,
    [storeId, req.user.email]
  );
  if (role.length === 0 || role[0].isAdmin === 0) {
    resData.error.message = "Unprevileged.";
    return res.status(400).send(resData);
  }

  const [storeData] = await connection.execute(
    `SELECT stores.storeId, name, description, admin, userEmail FROM stores LEFT JOIN store_users ON stores.storeId = store_users.storeId WHERE stores.storeId = ?`,
    [storeId]
  );

  let linked_users = [];
  for (let user of storeData) {
    let temp = {
      email: user.userEmail,
      isAdmin: user.admin === 0 ? false : true,
    };
    linked_users.push(temp);
  }

  resData.data = {
    name: storeData[0].name,
    description: storeData[0].description,
    linked_users: linked_users,
  };
  return res.status(200).send(resData);
};

exports.getStores = async (req, res) => {
  const connection = await mysql.createConnection(dbConfig);
  const [stores] = await connection.execute(
    `SELECT stores.storeId, name, description, admin FROM stores LEFT JOIN store_users ON stores.storeId = store_users.storeId WHERE userEmail = ?`,
    [req.user.email]
  );
  return res.status(200).send(stores);
};
