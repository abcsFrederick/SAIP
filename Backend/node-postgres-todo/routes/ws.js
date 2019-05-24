// var WebSocketServer = require('ws').Server,
//   wss = new WebSocketServer({path:'/api/v1/ws1',port: 40510})

// wss.on('connection', function (ws) {
//   ws.on('message', function (message) {
//     console.log('received: %s', message)
//     setTimeout(function(){ 
//       ws.send('5s and if TCP should disconnected already'); 
//     },5000)
//   })
// })

// var WebSocketServer = require('ws').Server,
// wss2 = new WebSocketServer({path:'/api/v1/ws2',port: 40511})

// wss2.on('connection', function (ws) {
//   ws.on('message', function (message) {
//     console.log('received: %s', message)
//     setTimeout(function(){ 
//       ws.send('5s and if TCP should disconnected already'); 
//     },5000)
//   })
// })
// var http = require('http');
// var WebSocket= require('ws');
// const wss1 = new WebSocket.Server({ noServer: true});
// const wss2 = new WebSocket.Server({ noServer: true});
// const server = http.createServer();


// wss1.on('connection', function connection(ws) {
//   // ...
//   console.log('received: %s', message)
// });
 
// wss2.on('connection', function connection(ws) {
//   // ...
//   console.log('received: %s', message)
// });

// server.on('upgrade', (request, socket, head) => {
//   const pathname = url.parse(request.url).pathname;
//   console.log(pathname);
//   if (pathname === '/api/v1/ws1') {
//     wss1.handleUpgrade(request, socket, head, (ws) => {
//       wss1.emit('connection', ws);
//       ws.on('message', function (message) {
//         console.log('received: %s', message)
//         setTimeout(function(){ 
//           ws.send('5s and if TCP should disconnected already'); 
//         },5000)
//       })
//     });
//   } else if (pathname === '/api/v1/ws2') {
//     wss2.handleUpgrade(request, socket, head, (ws) => {
//       wss2.emit('connection', ws);
//     });
//   } else {
//     socket.destroy();
//   }
// });