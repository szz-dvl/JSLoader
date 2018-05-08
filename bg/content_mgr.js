function CS (port) {

	var self = this;
	
	this.port = port;
	this.name = port.name;
	this.frame = port.sender || null;
	this.id = port.name.split("_")[1];
	this.history = [];
	
	this.run = function (scripts) {
		
		return new Promise(
			resolve => {
				
				let my_listener = function (args) {
					
					if (args.action == "post-results") {
						
						args.frame = Object.assign({}, self.frame);

						function status (script_id) {
							
							return args.errors.find(error => { return error.id == script_id }) ? false : true;
										
						};
									
						for(let script of args.run)
							self.updateHistory(script, status(script));
						
						resolve(args);
						
						self.port.onMessage.removeListener(my_listener);	
					}
				};
				
				self.port.onMessage.addListener(my_listener);
				
				self.port.postMessage({
					action: "run",
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

	this.updateHistory = function (script_id, status) {

		let idx = self.history.findIndex(
			record => {

				return record.id == script_id;

			}
		);

		if (idx < 0)
			self.history.push({id: script_id, status: status});
		else
			self.history[idx].status = status;
	}

	this.historyStatus = function (script_id) {
		
		let record = self.history.find(
			record => {

				return record.id == script_id;
				
			}
		);
		
		return record ? (record.status ? 1 : -1) : 0;
	}
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
	
	this.haveGlobal = function (key) {
		
		return typeof(self.globals[key]) !== 'undefined';
		
	};

	this.__postTaggedResponse = function (port, tag, message) {
		
		port.postMessage({action: "response", message: message, tag: tag});
		
	};

	this.addDomainToGroup = function (port, domain_name, group_name) {
		
		/* if (domain_name[domain_name.length - 1] != "/")
		   domain_name += "/"; */
			
			return self.bg.group_mgr.addSiteTo(group_name, domain_name);
	};

	
	this.addSiteToGroup = function (port, tag, site_name, group_name) {
		
		var url;
		
		try {
			
			if (site_name.includes("://"))
				url = site_name.split("://")[1];
			else
				url = site_name;

			/* if (url[0] != "*") {
			   
			   let aux = new URL("http://" + url); 

			   if (aux.pathname == "/" && site_name[site_name.length - 1] != "/")
			   site_name += "/";
			   } */
			
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

	this.getFrameForPort = function (port) {
		
		return self.alive.find(
			cs => {
				
				return cs.id == port.name.split("_")[1];
			
			}
		);
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

	this.getStatus = function (script_id, tabId) {

		let retval = 0;
		
		for (let frame of self.getMainFramesForTab(tabId)) {
			
			let status = frame.historyStatus(script_id);
			
			if (status) 
				retval = !retval ? status : (retval < status ? status : retval);
			
			if (retval > 0)
				break;
		}
		
		return retval;
	};

	this.framesFor = function (tabId) {

		return self.getMainFramesForTab(tabId).length;

	};

	this.reloadScriptAt = function (script, tabId) {

		let promises = [];
		
		for (let frame of self.getMainFramesForTab(tabId)) 
			promises.push(frame.run([script]));

		return Promise.all(promises);
		
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

		let created = !self.haveGlobal(key);
		
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
	
	this.contentSetProxy = function (port, tag, host, proxy, times) {
		
		self.bg.proxy_mgr.updatePAC(host, proxy, times)
			.then(
				length => {
					
					self.__postTaggedResponse(port, tag,
								  
						{
							status: length >= 0,
							content: {
								proxy: proxy,
								host: host,
								times: times
							}
							
						});
					
				}, err => {

					self.__postTaggedResponse(port, tag,
						
						{ status: false,
							
							content: {
								
								err: err.message
							}
						}
					);
					
				});
	};
		
	this.contentDownload = function (port, tag, options) {

		
		browser.downloads.download(typeof(options) == 'string' ? {url: options} : options)
			.then(
				
				id => {
					
					self.__postTaggedResponse(port, tag,
						
						{ status: true,
							
							content: {
								
								did: id
							}
						}
					);
				},
				err => {
					
					self.__postTaggedResponse(port, tag,
			
						{ status: false,
				
							content: {
								
								err: err.message
							}
						}
					);
					
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
												
												port.postMessage({action: "run",
													response: "update-history",
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
								case "update-history":
									
									if (!args.status && args.run[0] == 'UserDefs') 
										self.bg.notify_mgr.error("Bad User Defs: " + args.errors[0].type + ": " + args.errors[0].message);
									
									function status (script_id) {
										
										return args.errors.find(error => { return error.id == script_id }) ? false : true;
										
									};
									
									for(let script of args.run)
										self.getFrameForPort(port).updateHistory(script, status(script));
									
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
									self.contentSetProxy(port, args.tag, args.message.host, args.message.proxy, args.message.times);
									break;
									
								case "download-file":
									self.contentDownload(port, args.tag, args.message.args);
									break;
									
								default:
									break;
							}
						}
					);
					
					port.onDisconnect.addListener(
						port => {

							/* Check for error */
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

	this.storeNewDefs = function (changes, area) {
		
		if (area != "local")
	 		return;
		
		for (key of Object.keys(changes)) {
			
			if (key == "userdefs") 
				self.defs = changes.userdefs.newValue || "";			
		}
	};
	
	browser.storage.onChanged.addListener(this.storeNewDefs);
}
