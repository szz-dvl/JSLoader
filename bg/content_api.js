function CSUtils () {

	var self = this;

	this.events = new EventEmitter ();
	
	this.video = ["webm", "mp4", "ogg", "mkv"];
	
	this.isNativeVideoExtension = function (ext) {

		return self.video.includes(ext);

	}

	this.sendHttpRequest = function (url) {
		
		return new Promise (
			(resolve, reject) => {
				
				let rq = new XMLHttpRequest();
				rq.open("GET", url);
                
				rq.onload = function () {
					
					resolve (rq);
					
				}
                
				rq.onerror = function () {
					
					reject (rq);
					
				}
                
				rq.send();
			});
	}

	/* Caller must care about aborting the request if needed. */
	this.earlyHttpRequest = function (url) {
		
		return new Promise (
			(resolve, reject) => {
				
				let rq = new XMLHttpRequest();
				rq.open("GET", url);
                
				rq.onreadystatechange = function () {
					
					if (rq.readyState >= 3)
						resolve (rq);
					
				}
                
				rq.onerror = function () {
					
					reject (rq);
					
				}
                
				rq.send();
			});
	}

	this.postHttpRequest = function (url) {
		
		return new Promise (
			(resolve, reject) => {
				
				let rq = new XMLHttpRequest();
				rq.open("POST", url);
                
				rq.onload = function () {
					
					resolve (rq);
					
				}
                
				rq.onerror = function () {
					
					reject (rq);
					
				}
                
				rq.send();
			});
	}

}

function CSApi (port) {

	var self = this;

	this.port = port
	this.JSLUtils = new CSUtils();

	this.JSLAddSiteToGroup = function (site_name, group_name) {

		self.port.postMessage({action: "site-to-group", message: {site: site_name, group: group_name}});
		
	};

	this.JSLAddDomainToGroup = function (domain_name, group_name) {

		self.port.postMessage({action: "domain-to-group", message: {domain: domain_name, group: group_name}});

	}

	this.JSLNotifyUser = function (title, message) {
		
		self.port.postMessage({action: "notify", message: {title: title, body: message}});
		
	}

	this.JSLEventNeighbours = function (name, args) {
		
		self.port.postMessage({action: "event", message: {name: name, args: args}});
		
	}

	this.JSLGetGlobal = function (key) {
		
		self.port.postMessage({action: "get-global", message: {key: key}});
		
	}

	this.JSLSetGlobal = function (key, val) {
		
		self.port.postMessage({action: "set-global", message: {key: key, value: val}});
		
	}

	self.port.onMessage.addListener(

		request => {
			
			switch (request.action) {
				
			case "content-script-ev":
				
				self.JSLUtils.events.emit(request.message.name, request.message.args);

				break;

			case "content-script-global":
				
				self.JSLUtils.events.emit("global-request", request.message);

				break;
				
			default:
				break;
			}
		}
	);

}

