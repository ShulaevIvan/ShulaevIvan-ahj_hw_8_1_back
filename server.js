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
const archive = [];

wsServer.on('connection', (ws) => {
    Array.from(wsServer.clients)
        .filter(client => client.readyState === WS.OPEN  && client.newConnect !== false)
        .forEach(client => client.send(JSON.stringify({archive: archive})));
    const chatId = uuidv4();
    database.users.forEach((user, i) => {
        ws.uniqueID = { user: user.name, chatId: chatId }
        if (!activeClients[i]) {
            const client = {
                dbId: user.id,
                chatId: chatId,
                name: user.name,
                newConnect: true
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
        const message = e.toString()
        const nowTime = new Date().toLocaleString('ru', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false,
        });
        chat.push({user: ws.uniqueID, message: message});
        if (!archive.includes(ws.uniqueID.user) && !archive.includes(message) && !archive.includes(nowTime)) {
            archive.push({user: ws.uniqueID.user, message: message, time: nowTime})
        }
        
        const eventData = JSON.stringify({chat: [{user: ws.uniqueID.user, message: message, time: nowTime}]})
        Array.from(wsServer.clients)
        .filter(client => client.readyState === WS.OPEN)
        .forEach(client => client.send(eventData));
    })
});


app.use(koaBody({
    urlencoded:true,
}));
app.use(cors())
app.use(router());

server.listen(port);