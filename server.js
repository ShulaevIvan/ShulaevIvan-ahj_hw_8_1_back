const http = require('http');
const Koa = require('koa');
const WS = require('ws');
const { v4: uuidv4 } = require('uuid');
const cors = require('@koa/cors');
const koaBody = require('koa-body');
const router = require('./routes');
const database = require('./db/base');

const app = new Koa();
const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());

const wsServer = new WS.Server({
  server,
});

wsServer.on('connection', (ws) => {
  const wsObj = ws;
  Array.from(wsServer.clients)
    .filter((client) => client.readyState === WS.OPEN && client.newConnect !== false)
    .forEach((client) => client.send(JSON.stringify({ archive: database.archive })));

  const chatId = uuidv4();
  database.users.forEach((user, i) => {
    wsObj.uniqueID = { user: user.name, chatId: chatId };
    if (!database.activeClients[i]) {
      const client = {
        dbId: user.id,
        chatId: chatId,
        name: user.name,
        newConnect: true,
      };
      database.activeClients.push(client);
    }
  });

  database.activeClients.forEach((activeU, i) => {
    if (activeU.name === database.users[i].name) {
      database.users[i].chatId = chatId;
    }
  });

  Array.from(wsServer.clients)
    .filter((client) => client.readyState === WS.OPEN)
    .forEach((client) => client.send(JSON.stringify({ clients: database.activeClients })));

  wsObj.on('close', (e) => {
    database.users.forEach((user, i) => {
      if (user.name === wsObj.uniqueID.user) {
        database.users.splice(i, 1);
        database.activeClients.splice(i, 1);
      }
    });

    Array.from(wsServer.clients)
      .filter((client) => client.readyState === WS.OPEN)
      .forEach((client) => client.send(JSON.stringify({ clients: database.activeClients })));
  });

  wsObj.on('message', (e) => {
    const message = e.toString();
    const nowTime = new Date().toLocaleString('ru', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    database.chat.push({ user: wsObj.uniqueID, message: message });
    if (!database.archive.includes(wsObj.uniqueID.user)
    && !database.archive.includes(message) && !database.archive.includes(nowTime)) {
      database.archive.push({ user: wsObj.uniqueID.user, message: message, time: nowTime });
    }
    const eventData = JSON.stringify({
      chat: [{ user: wsObj.uniqueID.user, message: message, time: nowTime }],
    });

    Array.from(wsServer.clients)
      .filter((client) => client.readyState === WS.OPEN)
      .forEach((client) => client.send(eventData));
  });
});

app.use(koaBody({
  urlencoded: true,
}));
app.use(cors());
app.use(router());

server.listen(port);
