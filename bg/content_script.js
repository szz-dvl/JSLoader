function CS() {

	var self = this;
	
	this.status = true;
	this.modified = false;
	this.errors = [];
	
	this.run = function (code) {
		
		try {

			// script.run();
			(new Function(code)());
			
		} catch (err) {

			self.errors.push(err);
			
		}
	};

	this.runAll = function (scripts) {

		self.errors = [];
		
		for (script of scripts)
			self.run(script)
	};
	
	this.process = function (request) {

		self.message = null;
		self.status = true;
		
		switch(request.action) {
		case "run":

			self.errors = [];
			
			for (script of request.scripts) 
				self.run(script);
				
			if (self.errors.length) {
				
				self.message = self.errors;
				
				// console.error("Content script errors: ");
				// console.log(self.message);
				
				self.status = false;
			}

			self.modified = true;
			break;

		case "check":
			
			self.message = window.location.toString();
			break;

		case "revert":
			
			if (self.modified)
				window.location.reload();

			break;
			
		default:
			return Promise.reject({err: "Invalid cmd: " + request.action});
		}

		return Promise.resolve({status: self.status, message: self.message, action: request.action});
		
	};


	this.port = browser.runtime.connect({name:"content-script"});
	CSApi.call(self, self.port);
	
	this.port.onMessage.addListener(
		args => {

			switch(args.action) {
				
			case "content-script-run":
				
				self.runAll(args.message);
			
				for (error of errors)
					console.error(error);
				break;

			default:
				break;
				
			}

			//self.port.disconnect();
		}
	);
	
	this.port.postMessage({action: "get-info", message: window.location.toString()});
}

CS.call(this);

browser.runtime.onMessage.addListener(this.process);
