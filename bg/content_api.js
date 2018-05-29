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
			
			let promise = this.proxy
						? cs.__getMessageResponse("set-proxy",
							{ host: self.url.hostname, proxy: self.proxy, times: 1 })
				
				: Promise.resolve();  
			
			
			if (this.headers.length)
				this.headers.forEach(header => { this.rq.setRequestHeader(header.name, header.value) });
			
			promise.then(
				responses => {
				
					this.rq.open(this.method, this.url.href);
					
					this.rq.onreadystatechange = () => {
						
						if (this.rq.readyState >= this.enoughState)
							resolve (this.rq);
						
					}
					
					this.rq.onerror = () => {
						
						reject (this.rq);
						
					}
					
					this.rq.send(this.data);
					
				});
		});
}

class CSUtils extends EventEmitter {
	
	constructor(parent) {

		super();
		
		this.sendHttpRequest = (url) => {
			
			return new HttpRequest({

				url: url,
				method: "GET"
				
			}, parent);
		};

		/* Caller must care about aborting the request if needed. */
		this.earlyHttpRequest = (url) => {
			
			return new HttpRequest({
				
				url: url,
				method: "GET",
				early: true

			}, parent);
		};
		
		this.postHttpRequest = (url, data) => {
			
			return new HttpRequest({

				url: url,
				method: "POST",
				data: data
				
			}, parent);
		};
		
		/* @proxy: An object describing a proxy (host, port, type) */
		this.proxyHttpRequest = (url, proxy) => {

			return new HttpRequest({
				
				url: url,
				method: "GET",
				proxy: proxy

			}, parent);
		};

		this.modifiedHttpRequest = (url, headers) => {

			return new HttpRequest({
				
				url: url,
				method: "GET",
				headers: headers

			}, parent);
		};

		this.complexHttpRequest = (opt) => {
			
			return new HttpRequest(opt, parent);
			
		};
		
	}
}

function CSApi () {
	
	this.JSLUtils = new CSUtils(this);
	
	this.__getMessageResponse = (action, message) => {
		
		let event_id = UUID.generate().split("-").pop();
		
		this.port.postMessage({action: action, message: message, tag: event_id});
		
		return new Promise (
			(resolve, reject) => {		
				
				let myID = setTimeout(
					() => {
						
						this.JSLUtils.off(event_id);
						reject({ err: "Timed-out." });
						
					}, 5000);
				
				this.JSLUtils.once(event_id,
					response => {
						
						clearTimeout(myID);
						
						if (response.status)
							resolve(response.content);
						else
							reject(response.content); /* Treat error properly. */
					}
				);
			}
		);
	};
	
	this.JSLAddSiteToGroup = (site_name, group_name) => {

		return (site_name && group_name) ? this.__getMessageResponse ("site-to-group", {site: site_name, group: group_name}) : Promise.reject("Missing info.");
		
	};

	/* May return "undefined" values on unexistent keys */
	this.JSLGetGlobal = (key) => {
		
		return key ? this.__getMessageResponse ("get-global", {key: key}) : Promise.reject("Missing key");
		
	};

	this.JSLSetGlobal = (key, val) => {

		
		return key ? this.__getMessageResponse ("set-global", {key: key, value: val}) : Promise.reject("Missing key");
		
	};

	/* 
	   @hostname: host to proxy request.
	   @proxy: Proxy object {host, port, type}, if null the host will be "DIRECTED"
	   @times: # of requests to the give hostname that will be routed through this proxy (Negative number to indicate "forever") 
	   
	 */

	this.JSLProxyHost = (hostname, proxy, times) => {

		return hostname ? this.__getMessageResponse ("set-proxy", { host: hostname, proxy: proxy, times: times }) : Promise.reject("Missing hostname");
		
	};

	/* 
	   @params: Either an string representing a valid URL or an options object for browser.downloads.download as described at: 
	   
	   https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/downloads/download
	   
	   @proxy: A proxy object. If specified the requested proxy will be used for downloading the file.
	 
	 */
	
	this.JSLDownload = (params, proxy) => {

		if (params) {

			let url = typeof(params) == 'string' ? new URL(params) : new URL(params.url);
		
			let promises = [];

			if (proxy) {

				promises.push(this.__getMessageResponse("set-proxy",
					
					{ host: url.hostname, proxy: proxy, times: 1 }
				
				));
			}
			
			promises.push(this.__getMessageResponse ("download-file", {args: typeof(params) == 'string' ? {url: params} : params}));
		
			return Promise.all(promises);

		} else {

			return Promise.reject('Missing params');
		}
	};
	
	this.JSLNotifyUser = (title, message) => {
		
		this.port.postMessage({action: "notify", message: {title: title, body: message}});
		
	};
	
	this.JSLEventNeighbours = (name, args) => {

		if (name)
			this.port.postMessage({action: "event", message: {name: name, args: args}});
		
	};
	
	this.JSLResourceLoad = (path) => {

		return path ? this.__getMessageResponse("load-resource", { path: path }) : Promise.reject("Missing path");
	};

	this.JSLResourceUnload = (path) => {
		
		return path ? this.__getMessageResponse("unload-resource", { path: path }) : Promise.reject("Missing path");
	};

	this.JSLImportAsResource = (url, force, path) => {
		
		return url ?
			   this.__getMessageResponse("import-resource", { path: path || null, url: url, force: typeof(force) == 'undefined' ? false : force }) :
			   Promise.reject("Missing url");
	};
	
	/* Must remain in final version? Some pages blocks its devtools console ... */
	this.JSLDebug = (data) => {
		
		this.port.postMessage({action: "print", message: {data: data}});

	}
	
	this.JSLDebugError = (data) => {

		this.port.postMessage({action: "error", message: {data: data}});
		
	}
	
	this.port.onMessage.addListener(
		
		response => {
			
			switch (response.action) {
				
				/* Event Neighbours */
				case "content-script-ev":
				
					this.JSLUtils.emit(response.message.name, response.message.args);
					break;
					
				case "response":
					
					this.JSLUtils.emit(response.tag, response.message);
					break;
				
				default:
					break;
			}
		}
	);

	

}

