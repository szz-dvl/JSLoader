function CS() {

	var self = this;
	this.status = true;
	this.errors = [];
	
	this.run = function (code) {

		try {

			// script.run();
			(new Function(code)());
					
		} catch (err) {

			self.errors.push(err.message);
			
		}
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
				self.status = false;
			}
			
			break;
		case "backup":

			self.backup = $("html").html();
			break;

		case "check":

			// self.run("console.log($);");
			self.message = window.location.toString();
			break;

		case "revert":
			
			$("html").html(self.backup);
			break;
			
		default:
			return Promise.reject({err: "Invalid cmd: " + request.action});
		}

		return Promise.resolve({status: self.status, message: self.message, action: request.action});
		
	};
}

var content_script = new CS();

browser.runtime.onMessage.addListener(content_script.process);
