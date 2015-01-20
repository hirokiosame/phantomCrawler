module.exports = (function(){

	var http = require('http'),
		ws = require("ws");

	var HTTPServer, HTTPServerPort, HTTPServerPayload, WSServer;
	
	function initHTTPServer( EE, callback, port ){

		port = port || 0;

		// If server is already running
		if( HTTPServer !== undefined ){ return callback(null, HTTPServer, HTTPServerPort); }

		// Create Server
		HTTPServer = http.createServer(function (req, res){

			// Serve payload
			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(HTTPServerPayload);
		})

		.on("error", function(err){
			callback(err);
			process.exit();
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

	function initWebSocket(EE, server, callback){

		if( WSServer === undefined ){

			// Create Server
			WSServer = new ws.Server({ server: server });

			// Log
			EE.emit("log", "Web Socket Server bound to HTTP server");
		}

		return callback(null, WSServer, HTTPServerPort);
	}

	return function init(EE, callback, port){
		initHTTPServer(EE, function(err, server, port){

			initWebSocket(EE, server, callback);
		}, port);

		return EE;
	};
})();