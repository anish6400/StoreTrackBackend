const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser").json();

const app = express();
app.use(cors());
app.use(bodyParser);

const port = 5000;

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

const UserAuth = require("./common/userAuth.js");

const {
  signup,
  login,
  verify,
  resetPassword,
  requestPasswordReset,
  changePassword,
  deleteUser,
} = require("./routes/users.js");
const {
  getStores,
  addStore,
  editStore,
  deleteStore,
  getStore,
} = require("./routes/stores.js");
const {
  getTasks,
  addTask,
  editTask,
  deleteTask,
  getTaskHistory,
} = require("./routes/tasks.js");
const {
  getProducts,
  addProduct,
  editProduct,
  deleteProduct,
} = require("./routes/products.js");

app.post("/users/signup", signup);
app.get("/users/login", login);
app.post("/users/verify", verify);
app.post("/users/requestPasswordReset", requestPasswordReset);
app.put("/users/resetPassword", resetPassword);
app.put("/users/changePassword", UserAuth, changePassword);
app.delete("/users/delete", UserAuth, deleteUser);

app.get("/stores", UserAuth, getStores);
app.post("/store", UserAuth, addStore);
app.get("/store/:storeId", UserAuth, getStore);
app.put("/store/:storeId", UserAuth, editStore);
app.delete("/store/:storeId", UserAuth, deleteStore);

app.get("/tasks", UserAuth, getTasks);
app.post("/task", UserAuth, addTask);
app.use("/task/:taskId", UserAuth, editTask);
app.delete("/task/:taskId", UserAuth, deleteTask);
app.get("/task/:taskId/history", UserAuth, getTaskHistory);

app.get("/products", UserAuth, getProducts);
app.post("/product", UserAuth, addProduct);
app.use("/product/:productId", UserAuth, editProduct);
app.delete("/product/:productId", UserAuth, deleteProduct);

// server listening at the port
app.listen(port, function () {
  console.log(`App listening at port number: ${port}`);
});
