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
			self.globals.push(Object.assign({}, global)); /* Copy global here, otherwise objects created in an angular controllers become dead after the controller dies. (X-Ray ??)*/
			
		return self.storage.setGlobal(global);
		
	};
 
	this.__findGlobalByKey = function (key) {

		return self.globals.filter(
			gl => {

				return gl.key == key;

			})[0] || null;
	};

	this.__postTaggedResponse = function (port, tag, message) {

		port.postMessage({action: "response", message: message, tag: tag});

	};
	
	this.contentGetGlobal = function (port, tag, key) {

		let global = self.__findGlobalByKey(key);

		self.__postTaggedResponse(port, tag, {status: global ? true : false, content: {key: key, value: global ? global.value : undefined}});

	};

	this.contentSetGlobal = function (port, tag, key, value) {
		
		try {
										   
			(new Function("var " + key + ";")());
			
			let global = self.__findGlobalByKey(key) || {id: UUID.generate().split("-").pop(), key: key};
			global.value = value;

			self.upsertGlobal(global);

			self.__postTaggedResponse(port, tag, {status: true , content: {key: key, value: value}});
			
		} catch (e) {

			self.__postTaggedResponse(port, tag, {status: false , content: e.message});
			
		}
	};

	this.addSiteToGroup = function (port, tag, site_name, group_name) {

		var url;

		try {
			
			if (site_name.includes("://"))
				url = site_name.split("://")[1];
			else
				url = site_name;

			if (url[0] != "*") {
				
				let aux = new URL("http://" + url); 

				if (aux.pathname == "/" && site_name[site_name.length - 1] != "/")
					site_name += "/";
			}
			
			self.bg.group_mgr.addSiteTo(group_name, site_name)
				.then(
					() => {
						
						self.__postTaggedResponse(port, tag, {status: true , content: {site: site_name, group: group_name}});
						
					}
				)
			
		} catch (e) {

			self.__postTaggedResponse(port, tag, {status: false , content: e.message});

		}
	};

	this.notifyUser = function (title, message) {
		
		self.bg.notifyUser(title, message);
		
	};
	
	browser.runtime.onConnect
		.addListener(
			port => {
				
				if (port.name === 'content-script') {
					
					self.alive.push(port);
					
					console.log("New CS Port: ");
					console.log(port);
					
					port.onMessage.addListener(
						args => {
							
							switch (args.action) {
								
							case "site-to-group":
								self.addSiteToGroup(port, args.tag, args.message.site, args.message.group);
								break;
								
							case "notify":
								self.notifyUser(args.message.title, args.message.body);
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
								self.contentGetGlobal(port, args.tag, args.message.key);
								break;
								
							case "set-global":
								self.contentSetGlobal(port, args.tag, args.message.key, args.message.value);
								break;
								
							default:
								break;
							}
						}
					);
				}
			});

}
