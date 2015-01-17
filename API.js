module.exports = (function(){

	var events = require("events"),
		util = require("util");

	// Create API
	function phantomAPI(socket){

		// Invoke events emitter
		events.EventEmitter.apply(this);

		this.callback = null;

		this.socket = socket;
/*
		// Enforce new
		if( !(this instanceof phantomAPI) ){ return (phantomAPI = new phantomAPI(req, _callback)); }

		// Validation
		if( typeof _callback !== "function" ){ throw new Error("Callback not a function"); }

		// Current requested
		if( currentReq !== null ){
			_callback(new Error());
			return this;
		}

		// Store callbacks
		this.reqCallback = _callback;

		// Make available
		currentReq = this;*/
	}

	util.inherits(phantomAPI, events.EventEmitter);

	phantomAPI.prototype.req = function(req, callback){

		// Validation
		if( typeof callback !== "function" ){ throw new Error("Request callback is not a function"); }
		if( typeof req !== "object" || req === null ){ return callback(new Error("Request object is invalid")); }

		// Check if request is in progress
		if( this.callback !== null ){
			return callback(new Error("Currently processing a request; ignoring..."));
		}

		// Wait for response
		this.callback = callback;

		// Send req to Phantom
		this.socket.send(JSON.stringify(req));

		return this;
	};

	phantomAPI.prototype.res = function(res){

		// Ignore if no current req...
		if( this.callback === null ){ return; }


		res = JSON.parse(res);

		// On completely done
		if( res.type === 'closed' ){

			var callback = this.callback;

			// Done
			this.callback = null;

			// Remove log listeners
			this.removeAllListeners("log");

			if( this.result ){
				callback(null, this.result);
			}else{
				callback(new Error("PhantomJS page closed without result"));
			}

		}

		// If received logging message, send as log
		else if( res.type === 'log' ){
			this.emit("log", res);
		}

		// Otherwise, result
		else{
			this.result = res;
		}
	};

	return phantomAPI;

})();