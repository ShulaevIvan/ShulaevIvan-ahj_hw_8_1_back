const http = require('http');
const Koa = require('koa');
const WS = require('ws');
const cors = require('@koa/cors');
const koaBody = require('koa-body');
const router = require('./routes');
const database = require('./db/base');
const { v4: uuidv4 } = require('uuid');


const app = new Koa();
const port = process.env.PORT || 7070;
const server = http.createServer(app.callback());
const activeClients = [];

const wsServer = new WS.Server({
    server
});

const chat = [];

wsServer.on('connection', (ws) => {
    const chatId = uuidv4();
    database.users.forEach((user, i) => {
        ws.uniqueID = { user: user.name, chatId: chatId }
        if (!activeClients[i]) {
            const client = {
                dbId: user.id,
                chatId: chatId,
                name: user.name
            }
            activeClients.push(client);
        }
    });

    activeClients.forEach((activeU, i) => {
        if (activeU.name === database.users[i].name){
            database.users[i].chatId = chatId;
        }
    });

    Array.from(wsServer.clients)
        .filter(client => client.readyState === WS.OPEN)
        .forEach(client => client.send(JSON.stringify({clients: activeClients})));

    ws.on('close', (e) => {
        
        database.users.forEach((user, i) => {
            if (user.name === ws.uniqueID.user) {
                database.users.splice(i, 1);
                activeClients.splice(i, 1);
            }
        });
        Array.from(wsServer.clients)
        .filter(client => client.readyState === WS.OPEN)
        .forEach(client => client.send(JSON.stringify({clients: activeClients})));
    });

    ws.on('message', (e) => {
        chat.push()
        const message = e.toString()
        chat.push({user: ws.uniqueID, message: message});
        const eventData = JSON.stringify({chat: [{user: ws.uniqueID.user, message: message}]})
        Array.from(wsServer.clients)
        .filter(client => client.readyState === WS.OPEN)
        .forEach(client => client.send(eventData));
    })
});







// wsServer.on('connection', (ws) => {
//     ws.uniqueID = uuidv4();
//     activeClients.push(ws.uniqueID);
//     ws.send(ws.uniqueID)
//     ws.on('close', (e) => {
//         activeClients.forEach((clientId, i) => {
//             if (clientId === ws.uniqueID) {
//                 activeClients.splice(i, 1);
//             }
//         })
//     });
  
//     ws.on('message', (e) => {
//         const message = e.toString();
//         const checkDuplicate = database.users.find((user) => user.name === message)
//         if (checkDuplicate) return ws.send('user exists in database');
//         database.createUser(ws.uniqueID, message);
//         ws.send('welcome to chat')

//     })
//   });

app.use(koaBody({
    urlencoded:true,
}));
app.use(cors())
app.use(router());

server.listen(port);