module.exports = (function(){

	'use strict';

	var http = require('http'),
		child_process = require('child_process'),
		spawn = child_process.spawn,
		ws = require("ws");


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

		.on('connection', function(socket){

			var logger, callback;

			// Wait for results
			socket
			.on('message', function(res){
				res = JSON.parse(res);
				if( res.type === 'log' ){ logger(res); }
				else{
					callback(null, res);
					// logger = null;
					// callback = null;
				}
			})
			.on('error', function(){
				console.log('Socket error', arguments);
			})
			.on('close', function(code, message){
				console.log("Phantom left", arguments);

				// Callback to signal error
				callback(new Error("Phantom Crashed"));

				// Re-initialize
				initialized();
			});


			// Callback - return API
			connected(function phantomReq(req, _logger, _callback){

				// Validation
				if( typeof _logger !== "function" || typeof _callback !== "function" ){ return; }

				// Store callbacks
				logger = _logger;
				callback = _callback;

				// Send to Phantom
				socket.send(JSON.stringify(req));
			});
		});

		// Websocket initialized
		initialized();
	}

	function spawnPhantom(serverPort, processLogger){
		var proc = spawn('phantomjs', ['--ssl-protocol=any', __dirname + '/phantomCode.js', serverPort ]);

		proc.stdout.on('data', function (data){
			if( typeof processLogger !== "function" ){ return; }
			processLogger({
				type: "stdout",
				std: data.toString()
			});	
		});

		proc.stderr.on('data', function (data){
			if( typeof processLogger !== "function" ){ return; }
			processLogger({
				type: "stderr",
				std: data.toString()
			});	
		});

		proc.on('close', function (code, signal){
			console.log(process.pid, 'child process exited with code', arguments);

			// // code === 1

			// // If callback is still there, it hasn't been called, thus terminated early
			// if( typeof callbacks[id] === "function" ){ 
			// 	return log("Terminated early... retrying again", function(){
			// 		tryAgain(new Error("Terminated early"));
			// 	});
			// }

			// // Success
			// tryAgain(null, callbacks[id]);
		});

		// // Catches ctrl+c event to exit properly
		// process.on('SIGINT', process.exit);

		// // Cleanup before exit
		// process.on('exit', function(){

		// 	// Kill MySql connection
		// 	proc.kill('SIGHUP');

		// 	console.log("Exit!");
		// });
	}


	return function init( processLogger, callback, port ){

		port = port || 0;

		// Initialize HTTP Server
		initHTTPServer(port, function(err, server, serverPort){

			// console.log("HTTP Server ready", serverPort);

			// Initialize websocket
			initWebSocket(
				server,
				function initialized(){

					// Initialize Phantom Process
					spawnPhantom(serverPort, processLogger);
				},

				// Phantom Connected via socket
				callback
			);
		});
	};
})();