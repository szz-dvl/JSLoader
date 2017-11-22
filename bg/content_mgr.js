function CSMgr (bg) {
	
	var self = this;

	this.bg = bg;
	this.alive = [];
	this.storage = global_storage;
	this.globals = [];
	
	this.storage.getGlobalIDs(
		
		globals => {

			async.eachSeries(globals,
							 (id, next) => {

								 self.storage.getGlobal(
									 global => {
										 
										 //self.storage.removeGlobal(global);
										 
										 self.globals.push(global);
										 next();
										 
									 }, id);
								 

							 });
			
		});
	
	this.addDomainToGroup = function (port, domain_name, group_name) {


		if (domain_name[domain_name.length - 1] != "/")
			domain_name += "/";
	
		self.bg.group_mgr.addSiteTo(group_name, domain_name);

	}

	this.addSiteToGroup = function (port, site_name, group_name) {

		self.bg.group_mgr.addSiteTo(group_name, site_name);

	}

	this.notifyUser = function (port, title, message) {

		self.bg.notifyUser(title, message);

	}

	this.removeGlobal = function (global) {

		
		self.globals.remove(
			self.globals.findIndex(
				gl => {
					return gl.id == global.id;
				}
			)
		);

		return self.storage.removeGlobal(global);

	};

	this.upsertGlobal = function (global) {

		// delete global.$$hashKey;
		
		let mygl = self.globals.filter(
			gl => {
				return gl.id == global.id;
			}
		)[0];

		if (mygl) {
			
			mygl.key = global.key;
			mygl.value = global.value;
			
		} else 
			self.globals.push(Object.assign({}, global)); /* Copy global here, otherwise objects created in an angular controllers become dead after the controller dies.*/
			
		return self.storage.setGlobal(global);
		
	};

	this.__findGlobalByKey = function (key) {

		return self.globals.filter(
			gl => {

				return gl.key == key;

			})[0] || null;
	};

	this.contentGetGlobal = function (port, key) {

		let global = self.__findGlobalByKey(key);
		
		port.postMessage({action: "content-script-global", message: {key: key, value: global ? global.value : null}});

	};

	this.contentSetGlobal = function (key, value) {

		let global = self.__findGlobalByKey(key);
		let ngl = global || {id: UUID.generate().split("-").pop(), key: key, value: value};

		ngl.value = value;

		self.upsertGlobal(ngl);
		
	};
	
	browser.runtime.onConnect
		.addListener(
			port => {
				
				if (port.name === 'content-script') {
					
					self.alive.push(port);
					
					port.onMessage.addListener(
						args => {
							
							switch (args.action) {
							case "domain-to-group":
								self.addDomainToGroup(port, args.message.domain, args.message.group);
								break;
								
							case "site-to-group":
								self.addSiteToGroup(port, args.message.site, args.message.group);
								break;
								
							case "notify":
								self.notifyUser(port, args.message.title, args.message.body);
								break;
								
							case "event":
								
								self.alive.map(
									port => {
										
										try {
											
											port.postMessage({action: "content-script-ev", message: {name: args.message.name, args: args.message.args}});
											
										} catch (e) {}
									}
								);
								
								break;
								
							case "get-global":
								self.contentGetGlobal(port, args.message.key);
								break;

							case "set-global":
								self.contentSetGlobal(args.message.key, args.message.value);
								break;
								
							default:
								break;
							}
						}
					);
					
				}
			});

	// this.storeNewGlobals = function (changes, area) {
		
	// 	if (area != "local")
	//  		return;
		
	// 	for (key of Object.keys(changes)) {
			
	// 		if (key.includes("global-")) {
				
	// 			/* domain removed */
	// 			if (!changes[key].newValue)
	// 				self.__deadGlobal(changes[key].oldValue);
	// 		}
			
	// 	}
	// };
	
	// browser.storage.onChanged.addListener(this.storeNewGlobals);

}
