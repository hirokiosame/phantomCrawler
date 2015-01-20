module.exports = (function(){

	var phantomProcess = null,
		child_process = require('child_process'),
		spawn = child_process.spawn;


	// Cleanup before exit
	process.on('exit', function(){

		// Kill MySql connection
		phantomProcess.kill('SIGHUP');
	});

	return function(EE, serverPort){

		// Already running
		if( phantomProcess ){ return true; }

		// Spawn
		phantomProcess = spawn('phantomjs', ['--ssl-protocol=any', __dirname + '/phantomCode/index.js', serverPort ]);

		phantomProcess.stdout.on('data', function (data){
			EE.emit("stdout", data.toString());	
		});

		phantomProcess.stderr.on('data', function (data){
			EE.emit("stderr", data.toString());
		});

		phantomProcess.on('close', function (code, signal){
			EE.emit("error", "PhantomJS process(" + phantomProcess.pid + ") closed with code(" + code + ") and signal(" + signal + ")");

			// Remove
			phantomProcess = null;
		});

		EE.emit("log", "PhantomJS process(" + phantomProcess.pid + ") spawned");

		return false;
	};
})();