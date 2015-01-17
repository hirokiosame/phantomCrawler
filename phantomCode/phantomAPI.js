module.exports = function(serverPort){

	var page = browser.create();

		// Wait for request...
		page.onCallback = function(request){

			console.log("Received crawl request", request);

			// Parse request
			request = JSON.parse(request);

			// Make request
			var startTime = new Date();
			new Crawl(
				request.url,
				function log(msg){

					page.evaluate(function(msg){
						ws.send(msg);
					}, JSON.stringify({
						type: "log",
						time: new Date() - startTime,
						message: msg
					}));
				},
				function result(err, crawled){
					if( err ){
						return console.log("Error", err);
					}

					// Add result
					request.data = crawled;

					// Return result
					page.evaluate(function(result){
						ws.send(result);
					}, JSON.stringify(request));
				},
				function done(){

					// Return result
					page.evaluate(function(result){
						ws.send(result);
					}, JSON.stringify({
						type: "closed"
					}));	
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