"use strict";

var backup;

browser.runtime.onMessage.addListener(function(request) {

	
	console.log("Content script");
	/* console.log($("body").html());
	   console.log(request); */
	
	switch(request.action) {
		case "run":

			var errors = [];

			for (var i = 0; i < request.scripts.length; i++) {
				
				try {

					(new Function(request.scripts[i])());
				
				} catch (err) {

					errors.push(err.message);

				}
			}

			if (errors.length)
				return Promise.resolve({err: errors});
				
			break;
		case "backup":

			backup = $("body").html();
			break;

		case "revert":

			/* console.log("reverting: " + backup); */
			
			$("body").html(backup);
			break;
			
		default:
			return Promise.reject();
	}

	return Promise.resolve({response: "OK"});
	
});
