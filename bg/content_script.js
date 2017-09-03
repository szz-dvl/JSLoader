function CS() {

	var self = this;
	
	this.process = function (request) {
		
		console.log("Content script");
		
		switch(request.action) {
			case "run":
				
				var errors = [];

				for (script of request.scripts) {
					
					try {

						script.run();
						/* (new Function(script)()); */
						
					} catch (err) {

						errors.push(err.message);
					}
				}

				if (errors.length)
					return Promise.resolve({err: errors});
				
				break;
			case "backup":

				self.backup = $("html").html();
				break;

			case "revert":
				
				$("html").html(self.backup);
				break;
				
			default:
				return Promise.reject({err: ["Invalid cmd: " + request.action]});
		}

		return Promise.resolve({response: "OK"});
		
	};
}

var content_script = new CS();

browser.runtime.onMessage.addListener(content_script.process);
