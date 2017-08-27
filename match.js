"use strict";


browser.runtime.onMessage.addListener(request => {

	
	console.log("Content script");

	try {

		var func = new Function(request.func);
		func();

	} catch (err) {
		
		return Promise.resolve({err: err.message});
	}

	return Promise.resolve({response: "Successfully run."});

});
