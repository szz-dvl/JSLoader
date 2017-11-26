function CS (port) {

	var self = this;
	
	this.port = port;
	this.name = port.name;
	this.frame = port.sender || null;
	this.id = port.name.split("_")[1];
	
	this.run = function (scripts) {

		return new Promise(
			resolve => {

				let my_listener = function (args) {
					
					if (args.action == "post-results") {

						self.port.onMessage.removeListener(my_listener);
						args.frame = Object.assign({}, self.frame);
						resolve(args);
					
					}
				};
			
				self.port.onMessage.addListener(my_listener);
				
				self.port.postMessage({ action: "content-script-run",
										message: scripts });
			}
		);
	};  
	
}

function CSMgr (bg) {
	
	var self = this;

	this.bg = bg;
	this.alive = [];
	this.storage = global_storage;
	this.globals = [];
	
	this.storage.__getGlobalIDs(
		
		globals => {

			async.eachSeries(globals,
							 (id, next) => {
								 
								 self.storage.getGlobal(
									 global => {
										 
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

	this.getFramesForTab = function (tabId) {
		
		return self.alive.filter(
			cs => {
				
				return cs.frame.tab.id == tabId;
			
			}
		);
		
	};

	this.waitForFrames = function (tabId) {

		return new Promise(
			(resolve, reject) => {
				
				browser.tabs.reload(tabId, {bypassCache: true})
					.then(
						() => {
							
							
							let timeout = 5;
							let myID = setInterval(
								() => {
						
									let frames = self.getFramesForTab();
									
									if (frames.length) {
										
										clearInterval(myID);
										resolve();
										
									} else {
										
										timeout --;
										
										if (timeout == 0) {
											
											clearInterval(myID);
											reject();
											
										}
									}
									
								}, 500);
						});
			});
	};

	browser.runtime.onConnect
		.addListener(
			port => {
				
				if (port.name.startsWith('CS_')) {
					
					port.onMessage.addListener(
						args => {
							
							switch (args.action) {

							case "get-info":
								{

									self.alive.push(new CS(port));
									
									let url = new URL(args.message.url).sort();
									
									self.bg.domain_mgr.getScriptsForUrl(url)
										.then(
											scripts => {
												
												if (scripts)
													self.bg.updatePA(url);
												
												port.postMessage({action: "content-script-run",
																  message: (scripts || [])
																  .filter(
																	  script => {
																		  
																		  return !script.disabled;
																		  
																	  }
																  )
																  .map(
																	  script => {
																		  
																		  return script.code;
																		  
																	  }
																  )
																 });
												
											}
										);
								}
								
								break;
								
							case "site-to-group":
								self.addSiteToGroup(port, args.tag, args.message.site, args.message.group);
								break;
								
							case "notify":
								self.bg.notifyUser(args.message.title, args.message.body);
								break;
								
							case "event":
								{
									self.alive.map(
										port => {
											
											try {
												
												port.postMessage({action: "content-script-ev", message: {name: args.message.name, args: args.message.args}});
											
											} catch (e) {}
										}
									);
								}
								
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
					
					port.onDisconnect.addListener(
						() => {
		
							self.alive.remove(
								self.alive.findIndex(
									dead => {
										return dead.name == port.name;
									}
								)
							);		
						}
					);
				}
			});

}
