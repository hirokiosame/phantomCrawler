module.exports = (function(){

	var 
		events = require("events");

	var socket = null,
		currentRequest = null,
		receivedResult = null;


	var spawnPhantom = require("./spawnPhantom"),
		timeout = null;

	// Make EE
	var EE = new events.EventEmitter(),
		falseEE = { on: function(){} };

	// EE.setMaxListeners(1);
	EE.req = function handleRequest(req, callback){

		// Validation
		if( typeof callback !== "function" ){ throw new Error("Request callback is not a function"); }

		if( typeof req !== "object" || req === null ){
			callback(new Error("Request object is invalid"));
			return falseEE;
		}

		if( currentRequest !== null ){
			callback(new Error("Request in session"));
			return falseEE;
		}

		// Queue Request
		currentRequest = {
			req: req,
			callback: callback
		};

		sendRequest();

		return this;
	};

	function sendRequest(){

		// Ignore if not bridged
		if( socket === null ){ return; }

		// Ignore if no request is queued
		if( currentRequest === null ){ return; }

		if( typeof currentRequest.req === "object" &&
			typeof currentRequest.req.timeout === "number"
		){
			timeout = setTimeout(function(){

				// Timeout
				receivedResult = {
					"error": "Timeout"
				};

				// Kill Phantom
				spawnPhantom(true);

				// Return error
				returnData();

			}, currentRequest.req.timeout + 1000);
		}

		// Send req to Phantom
		socket.send(JSON.stringify(currentRequest.req));
	}

	function returnData(){

		if( currentRequest === null ){ return; }

		clearTimeout(timeout);

		// Done
		var _currentRequest = currentRequest;
		currentRequest = null;

		// Remove log listeners
		EE.removeAllListeners("log");

		// Check if there is a result
		if( receivedResult ){

			// Send back
			_currentRequest.callback(null, receivedResult);

			// Remove received data
			receivedResult = null;
		}else{

			// Sendback error
			_currentRequest.callback(new Error("PhantomJS page didn't return a result"));
		}	
	}

	function handleResponse(res){

		// Ignore if no current req...
		if( currentRequest === null ){ return; }

		if( res.type === 'error' ){
			receivedResult = {
				"error": res.message
			};
			return returnData();
		}

		// On completely done
		if( res.type === 'closed' ){
			return returnData();
		}

		// If received logging message, send as log
		if( res.type === 'log' ){
			return EE.emit("log", res);
		}

		// Otherwise, result
		receivedResult = res;
	}


	return function(callback){

		// Pass back API
		callback(EE);

		return {
			handleResponse: handleResponse,
			connected: function(_socket){

				// Reference socket
				socket = _socket;

				sendRequest();
			},
			disconnected: function(){

				// Remove reference
				socket = null;

				// Return data
				returnData();
			}
		};
	};
})();