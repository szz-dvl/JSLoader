function CS() {

	var self = this;
	
	this.process = function (request) {
		
		console.log("Content script");
		
		switch(request.action) {
			case "run":
				
				var errors = [];

				for (var script of request.scripts) {
					
					try {
						
						(new Function(script)());
						
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
				return Promise.reject();
		}

		return Promise.resolve({response: "OK"});
		
	};
}

var content_script = new CS();

browser.runtime.onMessage.addListener(content_script.process);
