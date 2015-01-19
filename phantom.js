module.exports = (function(){

	'use strict';

	var http = require('http'),
		child_process = require('child_process'),
		spawn = child_process.spawn,
		ws = require("ws"),
		events = require("events"),
		util = require("util"),
		API = require("./API");


	var server, serverPort,
		wsServer,
		phantomAPI;
	
	function initHTTPServer( port, callback ){

		// If server is already running
		if( server !== undefined ){ return callback(null, server, serverPort); }

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


	function initWebSocket(processLogger, server, initialized, connected){

		// Already Established
		if( wsServer !== undefined ){
			// Already Connected
			if( phantomAPI !== undefined ){ return connected(phantomAPI); }
			return initialized();
		}

		// Set up socket
		wsServer = new ws.Server({ server: server })

		// Phantom process connected to WS
		.on('connection', function(socket){

			processLogger.emit("log", "Phantom connected to WS");

			// Wait for results
			socket
			.on('message', function(res){

				// Forward response
				phantomAPI.res(JSON.parse(res));
			})
			.on('error', function(){
				console.log('Socket error', arguments);
			})
			.on('close', function(code, message){
				console.log("Phantom left ws", arguments);

				// Re-initialize
				initialized(function(){

					// Indicate close
					phantomAPI.res({
						type: 'closed'
					});
				});
			});

			// Callback - return API
			connected(phantomAPI = new API(socket));
		});

		// Websocket initialized
		initialized();
	}

	function spawnPhantom(serverPort, processLogger){
		var proc = spawn('phantomjs', ['--ssl-protocol=any', __dirname + '/phantomCode/index.js', serverPort ]);

		proc.stdout.on('data', function (data){
			processLogger.emit("stdout", data.toString());	
		});

		proc.stderr.on('data', function (data){
			processLogger.emit("stderr", data.toString());
		});

		proc.on('close', function (code, signal){
			processLogger.emit("error", "PhantomJS process(" + proc.pid + ") closed with code(" + code + ") and signal(" + signal + ")");

			// Will be respawned by initWebSocket
		});

		processLogger.emit("log", "PhantomJS process(" + proc.pid + ") running");

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

			if( err ){ return callback(err); }

			self.emit("log", "HTTP server listening to " + serverPort);

			// Initialize websocket
			initWebSocket(
				self,
				server,
				function initialized(callback){

					self.emit("log", "Web socket server listening to " + serverPort);

					// Initialize Phantom Process
					spawnPhantom(serverPort, self);
					if( typeof callback === "function" ){
						callback();
					}
				},

				// Phantom Connected via socket
				callback
			);
		});
	};

	util.inherits(init, events.EventEmitter);

	return init;
})();