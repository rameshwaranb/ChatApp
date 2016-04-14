var app = require('./app');
var debug = require('debug')('app:server');
var http = require('http');

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '9000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

exports.server = server;

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

//Object to store the sockets of the users
var users = {};
var io = require('socket.io').listen(server);

io.on('connection', function (socket) {
  console.log('user connected');

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  //Registering the user (save the socket to an object)
  socket.on('register', function(msg){
    users[msg.name] = socket;
  });

  socket.on('chat_message', function(msg){
    //Acknowledgement to know if the message sent
    users[msg.sender].emit('sender_ack', msg);

    //Emit the typed message to the receiver
    if(users[msg.receiver] && typeof users[msg.receiver].emit === 'function'){
      users[msg.receiver].emit('chat_message', msg);
    }
  });

  socket.on('receiver_ack', function(msg){
    //Acknowledgement to know if the message is delivered to the receiver
    users[msg.sender].emit('receiver_ack', msg);
  });

  socket.on('read_ack', function(msg){
    //Acknowledgement to know if the message is read by the receiver
    if(users[msg.sender] && typeof users[msg.sender].emit === 'function'){
      users[msg.sender].emit('read_ack', msg);
    }
  });

  socket.on('is_typing', function(msg){
    //To know if a message is being typed
    if(users[msg.receiver] && typeof users[msg.receiver].emit === 'function'){
      users[msg.receiver].emit('is_typing', msg);
    }
  });
});
