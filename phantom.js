module.exports = (function(){

	'use strict';

	var
		events = require("events"),
		initServer = require("./initServer"),
		phantomAPI = require("./phantomAPI");


	// Make EE
	var EE = new events.EventEmitter();

	EE.setMaxListeners(1);


	// Catches ctrl+c event to exit properly
	// process.on('SIGINT', process.exit);



	function init(callback, port){

		EE.removeAllListeners();

		// Initialize server
		initServer(EE, function(err, socket, port){

			if( err ){ return callback(err); }

			// Create Phantom API
			var API = phantomAPI(callback);

			// Phantom process connected to WS
			socket.on('connection', function(socket){

				EE.emit("log", "Phantom connected to WS");

				// Send queued request
				API.connected(socket);

				// Wait for results
				socket
				.on('message', function(res){

					// Forward response
					API.handleResponse(JSON.parse(res));
				})
				.on('error', function(err){
					EE.emit("error", err);
				})
				.on('close', function(code, message){

					EE.emit("error", "Phantom left WS");

					// Indicate close
					handleRes({
						type: 'closed'
					});
				});
			});

			// Spawn Phantom
			require("./spawnPhantom")(EE, port);
	
		}, port);

		return EE;
	}

	return init;
})();