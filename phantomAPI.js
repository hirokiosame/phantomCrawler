module.exports = function(serverPort){

	var page = browser.create();


		// Wait for request...
		page.onCallback = function(request){

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
				function done(err, crawled){
					if( err ){ return console.log("Error", err); }

					// Add result
					request.data = crawled;

					page.evaluate(function(result){
						ws.send(result);
					}, JSON.stringify(request));
				}
			);
		};


	page.open("http://127.0.0.1:"+serverPort+"/", function(status){
		console.log("Opened!", status);
	});

};