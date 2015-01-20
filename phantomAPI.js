module.exports = (function(){

	var 
		events = require("events");

	var socket = null,
		currentRequest = null,
		receivedResult = null;


	// Make EE
	var EE = new events.EventEmitter();

	EE.setMaxListeners(1);
	EE.req = function handleRequest(req, callback){

		// Validation
		if( typeof callback !== "function" ){ throw new Error("Request callback is not a function"); }
		if( typeof req !== "object" || req === null ){ return callback(new Error("Request object is invalid")); }

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

		// Send req to Phantom
		socket.send(JSON.stringify(currentRequest.req));
	}

	function handleResponse(res){

		// Ignore if no current req...
		if( currentRequest === null ){ return; }

		// On completely done
		if( res.type === 'closed' ){

			// Done
			var _currentRequest = currentRequest;
			currentRequest = null;

			// Remove log listeners
			EE.removeAllListeners("log");

			if( receivedResult ){
				_currentRequest.callback(null, receivedResult);
				receivedResult = null;
			}else{
				_currentRequest.callback(new Error("PhantomJS page closed without result"));
			}
		}

		// If received logging message, send as log
		else if( res.type === 'log' ){
			EE.emit("log", res);
		}

		// Otherwise, result
		else{
			receivedResult = res;
		}
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

				socket = null;
			}
		};
	};
})();