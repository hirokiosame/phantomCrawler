module.exports = (function(){

	// Scratch paper to store received headers
	var received = {};

	function Crawl(url, log, result, closed, imagePath){

		// Validate callback
		if( typeof closed !== "function" ){ throw new Error("Closed callback not a function"); }
		if( typeof result !== "function" ){ throw new Error("Result callback not a function"); }
		if( typeof log !== "function" ){ return result(new Error("Logger not a function") ); }

		// Validate URL
		if( typeof url !== "string" ){ return result(new Error("URL not a string")); }


		// Reference to this
		var self = this;

		// Reference logger
		this.log = log;

		// Create callback
		this.closed = closed;
		this.callback = function(){
			self.page.close();
			delete self.page;

			result(null, self);
		};

		// Create window
		this.page = browser.create();

		this.configure();

		this.bindEvents();

		this.page.open(url, function(status){

			// Error handling
			if( status !== "success" ){
				log({
					"event": "Failed to open"
				});
				return self.callback();
			}

			// Save Headers
			self.url = decodeURIComponent(self.page.url).split("#")[0];

			if( !received.hasOwnProperty(self.url) ){
				log({
					"event": "URL not found in header",
					"currentURL": self.url,
					"receivedURLs": Object.keys(received)
				});
			}else{
				self.headers = received[self.url].headers;
				self.status = received[self.url].status;
			}

			window.setTimeout(function(){

				// Render page
				if( typeof imagePath === "string" && imagePath.length > 0 ){
					self.page.render(imagePath, { format: "png", quality: 10 });
				}

				// Check if jQuery exists
				var jQuery = self.page.evaluate(function(){ return !!window.jQuery; });

				// Evaluate Page
				if( !jQuery ){
					log({
						"event": "Loading jQuery"
					});

					self.page.includeJs('//ajax.googleapis.com/ajax/libs/jquery/2.0.2/jquery.min.js', self.evaluate.bind(self));
				}else{
					self.evaluate();
				}

			}, 2000);
		});
	}

	Crawl.prototype.configure = function(){

		// Set window size
		this.page.viewportSize = {
			width: 1280,
			height: 800
		};

		// Turnoff security
		this.page.settings.webSecurityEnabled = false;

		// Set Useragent
		// this.page.settings.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.101 Safari/537.36"; 
		this.page.settings.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.101 Safari/537.36 (BU Crawler Directed Study http://goo.gl/5Ozfpb)"; 

		// 10 second timeout
		this.page.settings.resourceTimeout = 30000;

		// Don't load images
		this.page.settings.loadImages = false;

		// Clear Cookie Jar
		this.page.clearCookies();
	};

	Crawl.prototype.bindEvents = function(){

		var self = this;

		function bindEvents(page, events){

			for(var e in events){
				(function(e){
					page[e] = function(){

						var logMsg = {
							"event": e
						};

						for( var i = 0; i<events[e].length; i++ ){
							logMsg[events[e][i]] = arguments[i];
						}

						self.log(logMsg);
					};
				})(e);
			}
		}

		bindEvents(
			this.page,
			{
				// Function : arguments
				onAlert: ['msg'],
				onCallback: ['data'],
				// onClosing: ['closingPage'],
				onConfirm: ['msg'],
				// onConsoleMessage: ['msg', 'lineNum', 'sourceId'],
				onError: ['msg', 'trace'],
				onFilePicker: ['oldFile'],
				onInitialized: [],
				onLoadFinished: ['status'],
				onLoadStarted: [],
				onNavigationRequested: ['url', 'type', 'willNavigate', 'main'],
				onPageCreated: ['newPage'],
				onPrompt: ['msg', 'defaultVal'],
				// onResourceError: ['resourceError'],
				// onResourceReceived: ['response'],
				onResourceRequested: ['requestData', 'networkRequest'],
				onResourceTimeout: ['request'],
				onUrlChanged: ['targetUrl']
			}
		);

		this.page.onClosing = function(closingPage){
			self.log({
				"event": "onClosing",
				"closingPage": closingPage
			});

			self.closed();
		};

		this.page.onResourceReceived = function(response){

			self.log({
				"event": "onResourceReceived",
				"response": response
			});

			// If Error
			if( !response || response.status === null ){ return; }

			// Store Response
			if( response.stage === "end" && (response.contentType && response.contentType.match(/html/)) ){
				(received[decodeURIComponent(response.url)] = response);
			}
		};

		this.consoleLogs = [];
		this.page.onConsoleMessage = function(msg, lineNum, sourceId){

			self.log({
				"event": "onConsoleMessage",
				"msg": msg,
				"lineNum": lineNum,
				"sourceId": sourceId
			});

			self.consoleLogs.push({
				message: msg,
				lineNum: lineNum,
				sourceId: sourceId
			});
		};

		this.resourceError = [];
		this.page.onResourceError = function(resourceError){

			self.log({
				"event": "onResourceError",
				"resourceError": resourceError
			});
			
			self.resourceError.push(resourceError);
		};
	};

	Crawl.prototype.extractInputs = function(){

		return this.page.evaluate(function(){

			var $ = jQuery,
				inputs = [];

			// Find Inputs
			$("input:not(form *)").each(function(i, el){

				var input = {};

				// Extract attributes
				for( var i = 0; i<el.attributes.length; i++){
					input[el.attributes[i].nodeName] = el.attributes[i].nodeValue;
				}

				inputs.push(input);
			});

			return inputs;
		});
	};

	Crawl.prototype.extractLinks = function(){

		return this.page.evaluate(function(){

			var $ = jQuery,
				links = [];

			// Find Forms
			$("a").each(function(i, el){

				var link = $(el),
					href = link.attr("href");

				//Send it back
				if( href && href[0] !== "#" ){
					links.push({ text:link.text().trim(), href: href });
				}
			});

			// Signal Done
			return links;
		});
	};

	Crawl.prototype.extractForms = function(){

		return this.page.evaluate(function(){

			var $ = jQuery,
				forms = [];

			// Find Forms
			$("form").each(function(i, el){
				var form = $(el), data = {};

				// Extract attributes
				for( var i = 0; i<el.attributes.length; i++){
					data[el.attributes[i].nodeName] = el.attributes[i].nodeValue;
				}

				// Exclusive parameter
				data.params = [];

				// Find Inputs
				form.find("input").each(function(j, el){
					var input = {};

					for( var i = 0; i<el.attributes.length; i++){
						input[el.attributes[i].nodeName] = el.attributes[i].nodeValue;
					}

					data.params.push(input);
				});

				// Add
				forms.push(data);
			});

			// Signal Done
			return forms;
		});
	};

	Crawl.prototype.evaluate = function(){

		// Gather inputs
		this.extracted = {};
		this.extracted.inputs = this.extractInputs();
		this.extracted.links = this.extractLinks();
		this.extracted.forms = this.extractForms();

		// Callback
		this.callback();
	};

	return Crawl;
})()