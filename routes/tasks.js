exports.addTask = () => {
  // userId
  // storeId
  // name
  // description
  // status - unassigned, assigned, inProgress, skipped, completed
  // assignedTo
  // dueDate
  // openDate
};

exports.editTask = () => {
  // taskid
  // userId
  // storeId
  // name
  // description
  // status - unassigned, assigned, inProgress, skipped, completed
  // assignedTo
  // dueDate
  // openDate
};

exports.deleteTask = () => {
  // taskId
  // userId
};

exports.getTasks = () => {
  // userId
};

exports.getTaskHistory = () => {
  // userId
  // taskId
};

addTaskHistory = (taskId, userId, action, whatChange, change, time) => {};
