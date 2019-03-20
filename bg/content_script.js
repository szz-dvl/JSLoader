function ContentScript() {
	
	Promise = P;
	
	this.id = UUID.generate();

	Promise.onPossiblyUnhandledRejection(
		err => {

			try {
				
				let encoded = err.stack.split("/")[0].split("\n").pop().replace(/ /g, "");
				let action = encoded.split('$')[0].replace(/_/g,  '-');
				let script = encoded.split('$').pop().replace(/_/g, '-'); /* Any other way? */
				
				console.error("JSLoader => " + err.name + ": " + err.message);
				
				this.port.postMessage(
					{
						action: "update-history",
						status: false,
						errors: [
							{
								
								type: err.constructor.name,
									message:  err.message,
									line: err.lineNumber - 3,
									col: err.columnNumber,
									id: script,
									at: window.location.href,
									stamp: new Date().getTime()
							}
						],
						
						run: [script],
						inform: action == 'post-results',
						unhandled: true
					}
				);

			} catch (error) {

				console.error(error);
				console.error(err);
				
			}
		}
	);
	
	this.run = (script, response) => {
		
		try {

			/* Try to bind possible unhandled rejections to the script that generates it. */
			
			let encoded = 'function ' +
				response.replace(/-/g,  '_') +
				'$' + script.id.replace(/-/g,  '_') +
				'() {\n' + script.code + '\n}; ' +
				response.replace(/-/g,  '_') +
				'$' + script.id.replace(/-/g,  '_') + '();'; 

			new Function(encoded).call(this);
			
			return void 0;
			
		} catch (err) {
			
			return {
				raw: err,
				info: {
					
					type: err.constructor.name,
					message:  err.message,
					line: err.lineNumber - 3,
					col: err.columnNumber,
					id: script.id,
					at: window.location.href,
					stamp: new Date().getTime()
				}
			};
		}
	};

	this.runAll = (scripts, response) => {

		let errors = [];
		
		for (let script of scripts) {

			let error = this.run(script, response);

			if (error)
				errors.push(error);
		}
		
		for (let error of errors)
			console.error(error.raw);
				
		this.port.postMessage(
			
			{
				action: response,
				status: errors.length === 0,
				errors: errors.map(error => { return error.info }),
				run: scripts.map(script => { return script.id }),
				inform: false,
				unhandled: false
					
			}
		);
	};

	this.port = browser.runtime.connect({name:"CS_" + this.id});

	CSApi.call(this);
	
	this.port.onMessage.addListener(
		args => {
			
			switch(args.action) {
				
			case "run":

					this.runAll(args.message, args.response);
									
				break;
					
			case "info":

				try {

					new Function(args.message).call(this);
					
				} catch (e) {

					console.error(e);
					
					this.port.postMessage({

						action: "update-history",
						status: false,

						errors: [{
							
							type: "Bad user defs",
							message:  e.message,
							line: e.lineNumber - 3,
							col: e.columnNumber,
							id: "UserDefs",
							at: window.location.href,
							stamp: new Date().getTime()
								
						}],

						run: ['UserDefs']
					});					
				}

				this.port.postMessage({action: "get-jobs", message: { url: window.location.toString() }});
					
			default:
				break;
				
			}
		}
	);
	
	this.port.postMessage({action: "get-info", message: {id: this.id}});
}

ContentScript.call(this);
