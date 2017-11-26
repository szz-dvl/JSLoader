function CSUtils () {

	var self = this;

	this.events = new EventEmitter ();
	
	this.video = ["webm", "mp4", "ogg", "mkv"];
	
	this.isNativeVideoExtension = function (ext) {

		return self.video.includes(ext);

	};

	this.getNamedInputValue = function (name) {
    
		return $("input[name=" + name + "]").attr("value");
    
	};
	
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
	};

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
	};

	this.postHttpRequest = function (url, data) {
		
		return new Promise (
			(resolve, reject) => {
				
				let rq = new XMLHttpRequest();
				rq.open("POST", url);
                
				rq.onreadystatechange = function () {

					if (rq.readyState == 4)
						resolve (rq);	
				}
                
				rq.onerror = function () {
					
					reject (rq);
					
				}
                
				rq.send(data || null);
			});
	};
}

function CSApi () {

	var self = this;
	
	this.JSLUtils = new CSUtils();

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

