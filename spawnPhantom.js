module.exports = (function(){

	var phantomProcess = null,
		EE = null,
		port = null,
		child_process = require('child_process'),
		spawn = child_process.spawn;


	// Cleanup before exit
	process.on('exit', function(){

		if( phantomProcess === null ){ return; }

		// Kill MySql connection
		phantomProcess.kill('SIGHUP');
	});

	return function respawn(_EE, _serverPort){

		// Already running
		if( phantomProcess && _EE === true){

			// Kill process
			phantomProcess.kill('SIGHUP');

			return;
		}

		// Save event emitter
		if(
			EE === null &&
			typeof _EE === "object" &&
			typeof _EE.constructor === "function" &&
			_EE.constructor.name === "EventEmitter"
		){
			// Store EE
			EE = _EE;
		}

		// Save port
		if( port === null ){
			port = _serverPort;
		}


		// Spawn
		phantomProcess = spawn('phantomjs', ['--ssl-protocol=any', __dirname + '/phantomCode/index.js', port ]);

		phantomProcess.stdout.on('data', function (data){
			EE.emit("stdout", phantomProcess.pid, data.toString());	
		});

		phantomProcess.stderr.on('data', function (data){
			EE.emit("stderr", phantomProcess.pid, data.toString());
		});

		phantomProcess.on('close', function (code, signal){
			EE.emit("error", "PhantomJS process(" + phantomProcess.pid + ") closed with code(" + code + ") and signal(" + signal + ")");

			// Remove
			phantomProcess = null;

			// Respawn
			respawn(EE, port);
		});

		EE.emit("log", "PhantomJS process(" + phantomProcess.pid + ") spawned");

		return false;
	};
})();