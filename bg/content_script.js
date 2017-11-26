function ContentScript() {

	let self = this;
	
	this.id = UUID.generate();
	
	this.run = function (code) {
		
		try {
			
			(new Function(code)());

			return void 0;
			
		} catch (err) {

			return err;
			
		}
	};

	this.runAll = function (scripts) {

		let errors = [];
		
		for (script of scripts)
			errors.push(self.run(script));

		return errors.filter(err => { return err });
	};

	this.port = browser.runtime.connect({name:"CS_" + self.id});

	CSApi.call(self);
	
	this.port.onMessage.addListener(
		args => {
			
			switch(args.action) {
				
			case "run":
				
				let errors = self.runAll(args.message);
				
				for (error of errors)
					console.error(error);
				
				this.port.postMessage({action: "post-results", status: errors.length, errors: errors});
				
				break;

			case "info":

				try {

					new Function(args.message).call(self);
					
				} catch (e) {
					
					this.port.postMessage({action: "bad-user-defs", message: e.message});
					
				}

				this.port.postMessage({action: "get-jobs", message: {url: window.location.toString() }});
				
			default:
				break;
				
			}
		}
	);
	
	this.port.postMessage({action: "get-info", message: {id: self.id}});
}

ContentScript.call(this);
