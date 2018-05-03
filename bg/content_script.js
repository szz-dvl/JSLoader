function ContentScript() {

	let self = this;
	Promise = P;
	
	this.id = UUID.generate();
	
	this.run = function (script) {
		
		try {

			(new Function(script.code)());
			
			return void 0;
			
		} catch (err) {
			
			return {
				raw: err,
				info: {
				
					type: err.constructor.name,
					message:  err.message,
					line: err.lineNumber - 2,
					col: err.columnNumber,
					id: script.id,
					name: script.name,
					at: window.location.href,
					parent: script.parent,
					stamp: new Date().getTime()
				}
			};
		}
	};

	this.runAll = function (scripts, response) {

		let errors = [];

		async.eachSeries(scripts,
			(script, next) =>{

				let id = null;
				
				Promise.onPossiblyUnhandledRejection(
					err => {

						if (id)
							clearTimeout(id);
						
						errors.push(
							{
								raw: err,
								info: {	

									type: err.constructor.name,
									message:  err.message,
									line: err.lineNumber - 2,
									col: err.columnNumber,
									id: script.id,
									name: script.name,
									at: window.location.href,
									parent: script.parent,
									stamp: new Date().getTime()

								}
							}
						);

						next();
					}
				);
				
				let error = self.run(script);

				if (error) {
					
					errors.push(error);
					next();
					
				} else {

					/* Wait a jiffy for possible unhandled rejections */
					id = setTimeout(next, 150);
				}

			}, err => {

				for (error of errors)
					console.error(error.raw);
				
				this.port.postMessage(
					
					{
						action: response,
						status: errors.length === 0,
						errors: errors.map(error => { return error.info }),
						run: scripts.map(script => { return script.id })
					}
					
				);
			}
		);
	};

	this.port = browser.runtime.connect({name:"CS_" + self.id});

	CSApi.call(self);
	
	this.port.onMessage.addListener(
		args => {
			
			switch(args.action) {
				
			case "run":

					self.runAll(args.message, args.response);
									
				break;
					
			case "info":

				try {

					new Function(args.message).call(self);
					
				} catch (e) {

					console.error(e);
					
					this.port.postMessage({

						action: "update-history",
						status: false,

						errors: [{
							
							type: "Bad user defs",
							message:  e.message,
							line: e.lineNumber - 2,
							col: e.columnNumber,
							id: "UserDefs",
							name: "UserDefs",
							at: window.location.href,
							parent: null,
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
	
	this.port.postMessage({action: "get-info", message: {id: self.id}});
}

ContentScript.call(this);
