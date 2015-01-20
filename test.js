var initPhantom = require("./phantom.js");


(function makeReq(){

	// Sets up servers and spawns process
	initPhantom(function(phantom){

		// To repeat
		phantom
		.req(
			{
				id: 1,
				url: "http://google.com", //"http://163.com", //"https://espn.go.com",
				imagePath: "",
				timeout: 1000
			},
			function(err, result){
				if( err ){ console.log("Got Error", err); }
				else{ console.log("Got result!", result); }

				makeReq();
			}
		)
		.on("log", function(msg){
			// console.log("Log message", JSON.stringify(msg));
		});
	})
	.on("stdout", function(){
		console.log("stdout", arguments);
	})
	.on("stderr", function(){
		console.log("stderr", arguments);
	})
	.on("log", function(){
		console.log("log", arguments);
	})
	.on("error", function(){
		console.log("error", arguments);
	});
})();