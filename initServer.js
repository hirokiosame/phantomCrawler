module.exports = (function(){

	var http = require('http'),
		ws = require("ws");

	var HTTPServer, HTTPServerPort, HTTPServerPayload,
		WSServer, currentSocket = null;
	

	function randomPort(){
		return 1025 + ~~(Math.random()*(65535+1));
	}

	function initHTTPServer( EE, callback, port ){

		// If server is already running
		if( HTTPServer !== undefined ){ return callback(null, HTTPServer, HTTPServerPort); }

		port = port || randomPort();
		console.log("Port", port);

		// Create Server
		HTTPServer = http.createServer(function (req, res){

			// Serve payload
			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(HTTPServerPayload);
		})

		.on("error", function(err){

			// If overlap, retry until not in use
			if( err.code === 'EADDRINUSE' || err.code === 'EACCES' ){
				HTTPServer = undefined;
				initHTTPServer(EE, callback);
				return;
			}
			console.log(err.code);
			callback(err);
		})

		.listen(port, function(){

			HTTPServerPort = HTTPServer.address().port;

			// Log
			EE.emit("log", "HTTP Server listening to " + HTTPServerPort);

			// Create payload
			HTTPServerPayload = require("fs").readFileSync(__dirname + "/feSocket.js").toString().replace("serverPort", HTTPServerPort);

			// Ready - Callback
			callback(null, HTTPServer, HTTPServerPort);
		});
	}

	function initWebSocket(EE, server, initialized, API){

		// If already defined, send
		if( WSServer !== undefined ){

			// Indicate initialized
			return initialized(null, HTTPServerPort);
		}

		// If no server
		if( !server ){
			throw new Error("No server given to to start the WS");
		}

		// Create Server
		WSServer = new ws.Server({ server: server })

		.on('connection', function(clientSocket){

			// Save socket
			clientSocket

			.on('message', function(res){

				// Forward response
				API.handleResponse(JSON.parse(res));
			})
			.on('error', function(err){
				EE.emit("error", err);
			})
			.on('close', function(code, message){

				EE.emit("error", "Phantom left WS");
				API.disconnected();
			});

			EE.emit("log", "Phantom connected to WS");

			API.connected(clientSocket);
		});

		// Log
		EE.emit("log", "Web Socket Server bound to HTTP server");

		initialized(null, HTTPServerPort);
	}

	return function init(EE, initialized, API, port){
		initHTTPServer(EE, function(err, server, port){

			if( err ){ throw new Error(err); }

			initWebSocket(EE, server, initialized, API);
		}, port);

		return EE;
	};
})();