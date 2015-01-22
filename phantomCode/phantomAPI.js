module.exports = function(serverPort){

	var page = browser.create();

		function socketSend(data){
			page.evaluate(function(msg){
				ws.send(msg);
			}, JSON.stringify(data));
		}


		var _request = null;

		// Wait for request...
		page.onCallback = function(request){

			// If request active
			if( _request !== null ){ return socketSend({
				type: "error",
				message: "Request in session"
			}); }

			console.log("Received crawl request", request);

			// Parse request
			_request = JSON.parse(request);

			// Make request
			var startTime = new Date();
			new Crawl(
				_request.url,
				( typeof _request.timeout === "number" ) && _request.timeout || 0,
				function log(msg){

					socketSend({
						type: "log",
						time: new Date() - startTime,
						message: msg
					});
				},
				function result(err, crawled){

					// Add error
					if( err ){ _request.error = err; }

					// Add result
					else{ _request.data = crawled; }

					// Return result
					socketSend(_request);
				},
				function done(){

					console.log("Done crawling", request);

					_request = null;

					// Return result
					socketSend({
						type: "closed"
					});	
				}
			);
		};

	// Connect to HTTP server
	page.open("http://127.0.0.1:" + serverPort, function(status){
		if( status !== "success" ){
			 throw new Error('Failed to connect to the HTTP API Server');
			phantom.exit(1);
		}
		console.log("Connected to HTTP API server");
	});
};