var initPhantom = require("./phantom.js");


initPhantom(function(phantomReq){

	// To repeat
	(function makeReq(){
			
		phantomReq(
			{
				id: 1,
				url: "http://google.com",
				imagePath: "",
				timeout: 1000
			},
			function(err, result){
				if( err ){ return console.log(err); }
				console.log("Got result!", result);
				makeReq();
			}
		)
		.on("log", function(){
			// console.log("Log message", arguments);
		});
	})();

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