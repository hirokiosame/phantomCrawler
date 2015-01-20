module.exports = function(serverPort){

	var page = browser.create();

		function socketSend(data){
			page.evaluate(function(msg){
				ws.send(msg);
			}, JSON.stringify(data));
		}


		// Wait for request...
		page.onCallback = function(request){

			console.log("Received crawl request", request);
			
			// socketSend({
			// 	"type": "connected",
			// 	"id": system.pid
			// });

			// Parse request
			var _request = JSON.parse(request);

			// Make request
			var startTime = new Date();
			new Crawl(
				_request.url,
				function log(msg){

					socketSend({
						type: "log",
						time: new Date() - startTime,
						message: msg
					});
				},
				function result(err, crawled){
					if( err ){
						return console.log("Error", err);
					}

					// Add result
					_request.data = crawled;

					// Return result
					socketSend(_request);
				},
				function done(){

					console.log("Done crawling", request);

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