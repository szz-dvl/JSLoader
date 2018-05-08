function HttpRequest (opt, cs) {

	let self = this;
	
	this.url = new URL(opt.url),
	this.method = opt.method,
	this.enoughState = opt.early ? 3 : 4;
	this.proxy = opt.proxy || null;
	this.headers = opt.headers || [];
	this.data = opt.data  || null;
	
	this.rq = new XMLHttpRequest();
	
	return new Promise (
		(resolve, reject) => {

			let deps = [];
			
			if (self.proxy) {

				deps.push(cs.__getMessageResponse("set-proxy",
												  { host: self.url.hostname, proxy: self.proxy, times: 1 }));

			}
			
			if (self.headers.length)
				self.headers.forEach(header => { self.rq.setRequestHeader(header.name, header.value) });
			
			Promise.all(deps)
				.then(responses => {
					
					self.rq.open(self.method, self.url.href);
					
					self.rq.onreadystatechange = function () {
						
						if (self.rq.readyState >= self.enoughState)
							resolve (self.rq);
						
					}
					
					self.rq.onerror = function () {
						
						reject (self.rq);
						
					}
					
					self.rq.send(self.data);
					
				});
		});
}

function CSUtils (parent) {

	var self = this;

	this.cs = parent;
	this.events = new EventEmitter ();
	
	this.video = ["webm", "mp4", "ogg", "mkv"];
	
	this.isNativeVideoExtension = function (ext) {

		return self.video.includes(ext);

	};

	this.getNamedInputValue = function (name) {
    
		return $("input[name=" + name + "]").attr("value");
    
	};
	
	this.sendHttpRequest = function (url) {
		
		return new HttpRequest({

			url: url,
			method: "GET"

		}, self.cs);
	};

	/* Caller must care about aborting the request if needed. */
	this.earlyHttpRequest = function (url) {

		return new HttpRequest({

			url: url,
			method: "GET",
			early: true

		}, self.cs);
	};

	this.postHttpRequest = function (url, data) {

		return new HttpRequest({

			url: url,
			method: "POST",
			data: data

		}, self.cs);
	};

	/* @proxy: An object describing a proxy (host, port, type) */
	this.proxyHttpRequest = function (url, proxy) {

		return new HttpRequest({

			url: url,
			method: "GET",
			proxy: proxy

		}, self.cs);
	};

	this.modifiedHttpRequest = function (url, headers) {

		return new HttpRequest({
			
			url: url,
			method: "GET",
			headers: headers

		}, self.cs);
	};

	this.complexHttpRequest = function (opt) {

		return new HttpRequest(opt, self.cs);
	};
}

function CSApi () {

	var self = this;
	
	this.JSLUtils = new CSUtils(this);

	this.__getMessageResponse = function (action, message) {
		
		let event_id = UUID.generate().split("-").pop();

		self.port.postMessage({action: action, message: message, tag: event_id});
		
		return new Promise (
			(resolve, reject) => {		
				
				let myID = setTimeout(
					() => {

						self.JSLUtils.events.off(event_id);
						reject({status: false, content: "Timed-out."});
						
					}, 5000);
				
				self.JSLUtils.events
					.once(event_id,
						  response => {
							  
							  clearTimeout(myID);
							  resolve(response);
							  
						  });
				
			}
		);
	}
	
	this.JSLAddSiteToGroup = function (site_name, group_name) {

		return self.__getMessageResponse ("site-to-group", {site: site_name, group: group_name});
		
	};

	/* May return "undefined" values on unexistent keys */
	this.JSLGetGlobal = function (key) {

		return self.__getMessageResponse ("get-global", {key: key});
		
	};

	this.JSLSetGlobal = function (key, val) {

		return self.__getMessageResponse ("set-global", {key: key, value: val});
		
	};

	/* 
	   @hostname: host to proxy request.
	   @proxy: Proxy object {host, port, type}, if null the host will be "DIRECTED"
	   @times: # of requests to the give hostname that will be routed through this proxy (Negative number to indicate "forever") 
	   
	 */

	this.JSLProxyHost = function (hostname, proxy, times) {

		return self.__getMessageResponse ("set-proxy", { host: hostname, proxy: proxy, times: times });
		
	};

	/* 
	   @params: Either an string representing a valid URL or an options object for browser.downloads.download as described at: 
	   
	   https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/downloads/download
	   
	   @proxy: A proxy object. If specified the requested proxy will be used for downloading the file.
	 
	 */
	
	this.JSLDownload = function (params, proxy) {

		let url = typeof(params) == 'string' ? new URL(params) : new URL(params.url);
		
		let promises = [];

		if (proxy) {
			promises.push(self.__getMessageResponse("set-proxy",
				
				{ host: url.hostname, proxy: proxy, times: 1 }
				
			));
		}

		promises.push(self.__getMessageResponse ("download-file", {args: typeof(params) == 'string' ? {url: params} : params}));
		
		return Promise.all(promises);
	};
	
	this.JSLNotifyUser = function (title, message) {

		self.port.postMessage({action: "notify", message: {title: title, body: message}});
		
	};

	this.JSLEventNeighbours = function (name, args) {
		
		self.port.postMessage({action: "event", message: {name: name, args: args}});
		
	};
	
	self.port.onMessage.addListener(

		response => {
			
			switch (response.action) {

				/* Event Neighbours */
			case "content-script-ev":
				
				self.JSLUtils.events.emit(response.message.name, response.message.args);

				break;

			case "response":
				self.JSLUtils.events.emit(response.tag, response.message);

				break;
				
			default:
				break;
			}
		}
	);

}

