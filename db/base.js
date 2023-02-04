const database = {
  id: 0,
  users: [],
  activeClients: [],
  chat: [],
  archive: [],

  generateId() {
    this.id += 1;
    return this.id;
  },

  createUser(userName, token) {
    const id = this.generateId();
    const user = {
      id: id,
      name: userName,
      token: token,

    };
    this.users.push(user);
    return user;
  },
};

module.exports = database;
