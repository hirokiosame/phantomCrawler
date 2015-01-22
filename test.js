var initPhantom = require("./phantom.js");

// Sets up servers and spawns process
initPhantom(function(phantom){

	function makeReq(){

		// To repeat
		phantom
		.req(
			{
				id: 1,
				url: "http://google.com", //"http://163.com", //"https://espn.go.com",
				imagePath: "",
				timeout: 100
			},
			function(err, result){
				if( err ){ console.log("Got Error", err); }
				else{ console.log("Got result!", result); }
			}
		)
		.on("log", function(msg){
			// console.log("Log message", JSON.stringify(msg));
		});

	};

	setInterval(makeReq, 1000);

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