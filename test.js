var initPhantom = require("./phantom.js");


initPhantom(function(phantomReq){


	(function makeReq(){
			
		phantomReq(
			{
				id: 1,
				url: "http://google.com",
				imagePath: "",
				timeout: 1000
			},
			function(log){
				// console.log("Log", log);
			},
			function(err, result){
				if( err ){ return console.log(err); }
				console.log("Got result!", result);
				makeReq();
			}
		);
	})();

});