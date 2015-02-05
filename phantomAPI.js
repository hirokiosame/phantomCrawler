module.exports = (function(){

	var 
		events = require("events");

	var socket = null,
		currentRequest = null,
		receivedResult = null;


	var spawnPhantom = require("./spawnPhantom"),
		timeout = null;

	var parentEE;

	// Make EE
	var processEE = new events.EventEmitter(),
		falseEE = { on: function(){} };

	// EE.setMaxListeners(1);
	processEE.req = function handleRequest(req, callback){

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

		// If there is no active request, ignore
		if( currentRequest === null ){ return; }

		// Remove timeout error
		clearTimeout(timeout);

		// Done, store in temp local var
		var _currentRequest = currentRequest;
		currentRequest = null;

		// Remove log listeners
		processEE.removeAllListeners("log");

		// Check if there is a result
		if( receivedResult ){

			parentEE.emit("log", "Websocket successfully received response");

			// Send back
			_currentRequest.callback(null, receivedResult);

			// Remove received data
			receivedResult = null;
		}else{

			parentEE.emit("log", "PhantomJS closed page without result");

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
			return processEE.emit("log", res);
		}

		// Otherwise, result
		receivedResult = res;
	}


	return function(_parentEE, callback){

		// Parent EE
		parentEE = _parentEE;

		// Pass back API
		callback(processEE);

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