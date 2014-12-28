// (function(){

// 	'use strict';

	// Bind Polyfill
	if (!Function.prototype.bind) {
		Function.prototype.bind = function(oThis) {
			if (typeof this !== 'function') {
				// closest thing possible to the ECMAScript 5
				// internal IsCallable function
				throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
			}

			var aArgs   = Array.prototype.slice.call(arguments, 1),
			fToBind = this,
			fNOP    = function() {},
			fBound  = function() {
				return fToBind.apply(this instanceof fNOP && oThis
					? this
					: oThis,
					aArgs.concat(Array.prototype.slice.call(arguments)));
			};

			fNOP.prototype = this.prototype;
			fBound.prototype = new fNOP();

			return fBound;
		};
	}

	var system = require('system'),
		browser = require('webpage'),
		API = require("./phantomAPI"),
		Crawl = require('./phantomCrawl');


	// Validate arguments
	if( system.args.length !== 2 ){
		console.log("Enter only URL");
		phantom.exit();
	}

	// Instantiate API
	API(system.args[1]);

// })();
