module.exports = (function(){

	'use strict';

	var http = require('http'),
		child_process = require('child_process'),
		spawn = child_process.spawn,
		ws = require("ws"),
		events = require("events"),
		util = require("util");


	var server, serverPort;
	
	function initHTTPServer( port, callback ){

		// If server is already running
		if( server ){ return callback(null, server, serverPort); }

		server = http.createServer(function (req, res){
			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(require("fs").readFileSync(__dirname + "/feSocket.js").toString().replace("serverPort", serverPort));
		})

		.on("error", function(err){
			callback(err);
			process.exit();
		})

		.listen(port, function(){

			// Ready - Callback
			callback(null, server, (serverPort = server.address().port));
		});
	}

	function initWebSocket(server, initialized, connected){

		// Set up socket
		new ws.Server({ server: server })

		// Phantom process connected to WS
		.on('connection', function(socket){

			// Current phantom request
			var currentReq = null;

			// Wait for results
			socket
			.on('message', function(res){

				// Ignore if no current req...
				if( currentReq === null ){ return; }

				res = JSON.parse(res);

				// On completely done
				if( res.type === 'closed' ){

					var _currentReq = currentReq;

					// Done
					currentReq = null;

					if( _currentReq.result ){
						_currentReq.reqCallback(null, _currentReq.result);
					}else{
						_currentReq.reqCallback(new Error("PhantomJS page closed without result"));
					}
				}

				// If received logging message, send as log
				else if( res.type === 'log' ){
					currentReq.emit("log", res);
				}

				// Otherwise, result
				else{
					currentReq.result = res;
				}
			})
			.on('error', function(){
				console.log('Socket error', arguments);
			})
			.on('close', function(code, message){
				console.log("Phantom left", arguments);

				// Callback to signal error
				currentReq.reqCallback(new Error("Phantom disconnected from socket"));

				// Re-initialize
				initialized();
			});


			// Create API
			function phantomReq(req, _callback){

				// Enforce new
				if( !(this instanceof phantomReq) ){ return new phantomReq(req, _callback); }

				// Validation
				if( typeof _callback !== "function" ){ throw new Error("Callback not a function"); }

				// Current requested
				if( currentReq !== null ){
					_callback(new Error("Currently processing a request; ignoring..."));
					return this;
				}

				// Invoke events emitter
				events.EventEmitter.apply(this);

				// Store callbacks
				this.reqCallback = _callback;

				// Make available
				currentReq = this;

				// Send req to Phantom
				socket.send(JSON.stringify(req));
			}

			util.inherits(phantomReq, events.EventEmitter);


			// Callback - return API
			connected(phantomReq);
		});

		// Websocket initialized
		initialized();
	}

	function spawnPhantom(serverPort, processLogger){
		var proc = spawn('phantomjs', ['--ssl-protocol=any', __dirname + '/phantomCode.js', serverPort ]);

		proc.stdout.on('data', function (data){
			processLogger.emit("stdout", data.toString());	
		});

		proc.stderr.on('data', function (data){
			processLogger.emit("stderr", data.toString());
		});

		proc.on('close', function (code, signal){
			processLogger.emit("error", "Phantom process closed with code(" + code + ") and signal(" + signal + ")");

			// Will be respawned by initWebSocket
		});

		// Catches ctrl+c event to exit properly
		process.on('SIGINT', process.exit);

		// Cleanup before exit
		process.on('exit', function(){

			// Kill MySql connection
			proc.kill('SIGHUP');
		});
	}


	function init( callback, port ){

		// Enforce new
		if( !(this instanceof init) ){ return new init(callback, port); }

		// Invoke events emitter
		events.EventEmitter.apply(this);

		var self = this;

		port = port || 0;

		// Initialize HTTP Server
		initHTTPServer(port, function(err, server, serverPort){

			self.emit("log", "HTTP server listening to " + serverPort);

			// Initialize websocket
			initWebSocket(
				server,
				function initialized(){

					self.emit("log", "Web socket server listening to " + serverPort);

					// Initialize Phantom Process
					spawnPhantom(serverPort, self);
				},

				// Phantom Connected via socket
				callback
			);
		});
	};

	util.inherits(init, events.EventEmitter);

	return init;
})();