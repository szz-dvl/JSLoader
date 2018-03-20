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
						
						args.frame = Object.assign({}, self.frame);
						resolve(args);
						
						self.port.onMessage.removeListener(my_listener);
						
					}
				};
			
				self.port.onMessage.addListener(my_listener);
				
				self.port.postMessage({ action: "run",
										response: "post-results",
										message: scripts.map(
											script => {
												
												return { code: script.code, id: script.uuid, name: script.name, parent: script.getParentName() };
												
											}
										)
									  });
			}
		);
	};  
}

function CSMgr (bg) {
	
	let self = this;

	this.bg = bg;
	this.alive = [];
	this.storage = global_storage;
	this.globals = {};
	
	this.storage.getGlobals(
		
		globals => {

			self.globals = globals || {};
			
		});
	
	this.storage.getUserDefs(
		defs => {
				
			self.defs = defs;
			
		});
	
	this.setUserDefs = function (literal) {
		
		self.defs = literal;
		return this.storage.setUserDefs(literal);
		
	};

	this.setGlobals = function (literal) {
		
		self.globals = JSON.parse(literal); /* Validated in view */
		return this.storage.setGlobals(self.globals);
		
	};
	
	this.addDomainToGroup = function (port, domain_name, group_name) {
		
		if (domain_name[domain_name.length - 1] != "/")
			domain_name += "/";
	
		self.bg.group_mgr.addSiteTo(group_name, domain_name);
	};
 
	this.haveGlobal = function (key) {

		return typeof(self.globals[key]) !== 'undefined';
		
	};

	this.__postTaggedResponse = function (port, tag, message) {

		port.postMessage({action: "response", message: message, tag: tag});
		
	};
	
	this.contentGetGlobal = function (port, tag, key) {
		
		self.__postTaggedResponse(port, tag,
								  {status: self.globals[key] ? true : false,
								   content: {
									   key: key,
									   value: self.globals[key]
								   }
								  });

	};

	this.contentSetGlobal = function (port, tag, key, value) {

		let created = !haveGlobal(key);
		
		self.globals[key] = value;
		
		this.storage.setGlobals(self.globals)
			.then(
				() => {
					
					self.__postTaggedResponse(port, tag,
											  {
												  status: true,
												  content: {
													  key: key,
													  value: value,
													  created: created
												  }
											  });
				
				},
				() => {

					self.__postTaggedResponse(port, tag,
											  {
												  status: false,
												  content: {
													  err: "Persist error",
													  key: key,
													  value: value,
													  created: created
												  }
											  });
				});
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
						
						self.__postTaggedResponse(port, tag,
												  {
													  status: true,
													  content: {
														  site: site_name,
														  group: group_name
													  }
												  });
						
					}
				)
			
		} catch (e) {

			self.__postTaggedResponse(port, tag,
									  {
										  status: false,
										  content: {
											  err: e.message,
											  site: site_name,
											  group: group_name
										  }
									  });

		}
	};

	this.getFramesForTab = function (tabId) {
		
		return self.alive.filter(
			cs => {
				
				return cs.frame.tab.id == tabId;
			
			}
		);
		
	};

	this.getMainFramesForTab = function (tabId) {
		
		return self.getFramesForTab(tabId).filter(
			
			cs => {
				
				return cs.frame.url === cs.frame.tab.url;	
				
			}
			
		);	
	};

	this.__waitForFrames = function (tabId, reload) {

		return new Promise(
			(resolve, reject) => {

				let promise = reload
					? browser.tabs.reload(tabId, {bypassCache: false})
					: Promise.resolve();
				
				promise.then(
					() => {
						
						let timeout = 5;
						let myID = setInterval(
							() => {
								
								let frames = self.getFramesForTab(tabId);
								
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

	this.__forceMainFramesForTab = function (tabId, reload) {

		return new Promise (
			(resolve, reject) => {

				let frames = self.getMainFramesForTab(tabId);
				
				if (frames.length)
					resolve(frames);

				else {
					
					self.__waitForFrames(tabId, reload)
						.then(
							frames => {
							
								resolve(self.getMainFramesForTab(tabId));
							
							}, reject
						);
				}
				
			});
	};

	this.forceMainFramesForTab = function (tabId) {

		return self.__forceMainFramesForTab(tabId, true);

	};

	this.waitMainFramesForTab = function (tabId) {

		return self.__forceMainFramesForTab(tabId, false);

	};

	this.contentSetProxy = function (port, tag, host, proxy) {

		self.bg.rules_mgr.tempProxy(host, proxy)
			.then(
				length => {
					
					self.__postTaggedResponse(port, tag,
								  
											  {status: length > 0,
											   
											   content: {
												   proxy: proxy,
												   host: host
											   }
											   
											  });
				});
	};

	this.contentSetRule = function (port, tag, criteria, headers) {
		
		self.__postTaggedResponse(port, tag,
								  
								  {status: true,

								   content: {
									   rid: self.bg.rules_mgr.tempRule(criteria, headers)
								   }
								   
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
									port.postMessage({action: "info", message: self.defs });

								}
								
								break;
								
							case "get-jobs":
								{

									let url = new URL(args.message.url).sort();
									
									self.bg.domain_mgr.getScriptsForUrl(url)
										.then(
											scripts => {
												
												if (scripts)
													self.bg.tabs_mgr.updatePA(url.href);
												
												port.postMessage({action: "run",
																  response: "ret-logs",
																  message: (scripts || [])
																  .filter(
																	  script => {
																		  
																		  return !script.disabled;
																		  
																	  }
																  )
																  .map(
																	  script => {
																		  
																		  return { code: script.code, id: script.uuid, name: script.name, parent: script.getParentName() };
																		  
																	  }
																  )
																 });
												
											}
										);
								}
								
								break;
							case "ret-logs":
								
								if (!args.status) 
									self.bg.logs_mgr.logErrors(args.errors);
								
								break;
								
							case "site-to-group":
								self.addSiteToGroup(port, args.tag, args.message.site, args.message.group);
								break;
								
							case "notify":
								self.bg.notify_mgr.user(args.message.title, args.message.body);
								break;
								
							case "event":
								{
									self.alive.map(
										cs => {
											
											try {
												
												cs.port.postMessage({action: "content-script-ev", message: {name: args.message.name, args: args.message.args}});
											
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
								
							case "set-proxy":
								self.contentSetProxy(port, args.tag, args.message.host, args.message.proxy);
								break;

							case "set-rule":
								self.contentSetRule(port, args.tag, args.message.criteria, args.message.headers);
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
