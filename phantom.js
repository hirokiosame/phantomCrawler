module.exports = (function(){

	'use strict';

	var
		events = require("events"),
		initServer = require("./initServer"),
		phantomAPI = require("./phantomAPI"),
		spawnPhantom = require("./spawnPhantom");


	// Make EE
	var EE = new events.EventEmitter();


	// Catches ctrl+c event to exit properly
	// process.on('SIGINT', process.exit);


	function init(callback, port){

		// Reset EE
		// EE.removeAllListeners();

		// Create Phantom API
		var API = phantomAPI(callback);

		// Initialize server
		initServer(
			EE,
			function serverInitialized(err, port){

				if( err ){ return callback(err); }

				// Spawn Phantom
				spawnPhantom(EE, port);
			},
			API,
			port
		);

		return EE;
	}

	return init;
})();