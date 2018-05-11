function CS (port) {

	this.port = port;
	this.name = port.name;
	this.frame = port.sender || null;
	this.id = port.name.split("_")[1];
	this.history = [];
	
	this.run = (scripts) => {
		
		return new Promise(
			resolve => {
				
				let my_listener = (args) => {
					
					if (args.action == "post-results") {
						
						args.frame = Object.assign({}, this.frame);
						
						function status (script_id) {
							
							return args.errors.find(error => { return error.id == script_id }) ? false : true;
										
						};
									
						for(let script of args.run)
							this.updateHistory(script, status(script));
						
						resolve(args);
						
						this.port.onMessage.removeListener(my_listener);	
					}
				};
				
				this.port.onMessage.addListener(my_listener);
				
				this.port.postMessage({
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

	this.updateHistory = (script_id, status) => {

		let idx = this.history.findIndex(
			record => {

				return record.id == script_id;

			}
		);

		if (idx < 0)
			this.history.push({id: script_id, status: status});
		else
			this.history[idx].status = status;
	}

	this.historyStatus = (script_id) => {
		
		let record = this.history.find(
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

			this.globals = globals || {};
			
		});
	
	this.storage.getUserDefs(
		defs => {
				
			this.defs = defs;
			
		});
	
	this.setUserDefs = (literal) => {
		
		this.defs = literal;
		return this.storage.setUserDefs(literal);
		
	};
	
	this.haveGlobal = (key) => {
		
		return typeof(this.globals[key]) !== 'undefined';
		
	};
	
	this.__postTaggedResponse = (port, tag, message) => {
		
		port.postMessage({action: "response", message: message, tag: tag});
		
	};

	this.addDomainToGroup = (port, domain_name, group_name) => {
		
		/* if (domain_name[domain_name.length - 1] != "/")
		   domain_name += "/"; */
			
			return this.bg.group_mgr.addSiteTo(group_name, domain_name);
	};

	
	this.addSiteToGroup = (port, tag, site_name, group_name) => {
		
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
			
			this.bg.group_mgr.addSiteTo(group_name, site_name)
				.then(
					() => {
						
						this.__postTaggedResponse(port, tag,
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

			this.__postTaggedResponse(port, tag,
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

	this.getFrameForPort = (port) => {
		
		return this.alive.find(
			cs => {
				
				return cs.id == port.name.split("_")[1];
			
			}
		);
	};
	
	this.getFramesForTab = (tabId) => {
		
		return this.alive.filter(
			cs => {
				
				return cs.frame.tab.id == tabId;
			
			}
		);
		
	};

	this.getMainFramesForTab = (tabId) => {
		
		return this.getFramesForTab(tabId).filter(
			
			cs => {
				
				return cs.frame.url === cs.frame.tab.url;	
				
			}		
		);	
	};

	this.__waitForFrames = (tabId, reload) => {

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
								
								let frames = this.getFramesForTab(tabId);
								
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

	this.__forceMainFramesForTab = (tabId, reload) => {

		return new Promise (
			(resolve, reject) => {

				let frames = this.getMainFramesForTab(tabId);
				
				if (frames.length)
					resolve(frames);

				else {
					
					this.__waitForFrames(tabId, reload)
						.then(
							frames => {
							
								resolve(this.getMainFramesForTab(tabId));
							
							}, reject
						);
				}
				
			});
	};

	this.forceMainFramesForTab = (tabId) => {

		return this.__forceMainFramesForTab(tabId, true);

	};

	this.waitMainFramesForTab = (tabId) => {

		return this.__forceMainFramesForTab(tabId, false);

	};

	this.getStatus = (script_id, tabId) => {

		let retval = 0;
		
		for (let frame of this.getMainFramesForTab(tabId)) {
			
			let status = frame.historyStatus(script_id);
			
			if (status) 
				retval = !retval ? status : (retval < status ? status : retval);
			
			if (retval > 0)
				break;
		}
		
		return retval;
	};

	this.framesFor = (tabId) => {

		return this.getMainFramesForTab(tabId).length;

	};

	this.reloadScriptAt = (script, tabId) => {

		let promises = [];
		
		for (let frame of this.getMainFramesForTab(tabId)) 
			promises.push(frame.run([script]));

		return Promise.all(promises);
		
	};

	this.contentGetGlobal = (port, tag, key) => {

		let globals = this.globals;
		
		this.__postTaggedResponse(port, tag,
			{status: globals[key] ? true : false,
				content: {
					key: key,
					value: globals[key]
				}
			});
	};
	
	this.contentSetGlobal = (port, tag, key, value) => {

		let created = !this.haveGlobal(key);
		
		this.globals[key] = value;
		
		this.storage.setGlobals(this.globals)
			.then(
				() => {
					
					this.__postTaggedResponse(port, tag,
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
					
					this.__postTaggedResponse(port, tag,
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
	
	this.contentSetProxy = (port, tag, host, proxy, times) => {
		
		this.bg.proxy_mgr.updatePAC(host, proxy, times)
			.then(
				length => {
					
					this.__postTaggedResponse(port, tag,
						
						{
							status: length >= 0,
							content: {
								proxy: proxy,
								host: host,
								times: times
							}
							
						});
					
				}, err => {

					this.__postTaggedResponse(port, tag,
						
						{ status: false,
							
							content: {
								
								err: err.message
							}
						}
					);
					
				});
	};
	
	this.contentDownload = (port, tag, options) => {
		
		
		browser.downloads.download(typeof(options) == 'string' ? {url: options} : options)
			.then(
				
				id => {
					
					this.__postTaggedResponse(port, tag,
						
						{ status: true,
							
							content: {
								
								did: id
							}
						}
					);
				},
				err => {
					
					this.__postTaggedResponse(port, tag,
						
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
										
										this.alive.push(new CS(port));
										let defs = this.defs;
										
										port.postMessage({action: "info", message: defs });
										
									}
									
									break;
									
								case "get-jobs":
									{
										
										let url = new URL(args.message.url).sort();
										
										this.bg.domain_mgr.getScriptsForUrl(url)
											.then(
												scripts => {
													
													if (scripts.length) {
														
														port.postMessage({action: "run",
															response: "update-history",
															message: scripts.filter(
																script => {
																	
																	return !script.disabled;
																	
																}
															).map(
																script => {
																	
																	return { code: script.code, id: script.uuid, name: script.name, parent: script.getParentName() };
																	
																}
															)
														});
													}
												}
											);
									}
									
									break;
								case "update-history":
									
									if (!args.status && args.run[0] == 'UserDefs') 
										this.bg.notify_mgr.error("Bad User Defs: " + args.errors[0].type + ": " + args.errors[0].message);
									
									function status (script_id) {
										
										return args.errors.find(error => { return error.id == script_id }) ? false : true;
										
									};
									
									for(let script of args.run)
										this.getFrameForPort(port).updateHistory(script, status(script));
									
									break;
									
								case "site-to-group":
									this.addSiteToGroup(port, args.tag, args.message.site, args.message.group);
									break;
									
								case "notify":
									this.bg.notify_mgr.user(args.message.title, args.message.body);
									break;
									
								case "event":
									{
										this.alive.map(
											cs => {
												
												try {
													
													cs.port.postMessage({action: "content-script-ev", message: {name: args.message.name, args: args.message.args}});
													
												} catch (e) {}
											}
										);
									}
									
									break;
									
								case "get-global":
									this.contentGetGlobal(port, args.tag, args.message.key);
									break;
									
								case "set-global":
									this.contentSetGlobal(port, args.tag, args.message.key, args.message.value);
									break;
									
								case "set-proxy":
									this.contentSetProxy(port, args.tag, args.message.host, args.message.proxy, args.message.times);
									break;
									
								case "download-file":
									this.contentDownload(port, args.tag, args.message.args);
									break;
									
								default:
									break;
							}
						}
					);
					
					port.onDisconnect.addListener(
						port => {
							
							/* Check for error */
							this.alive.remove(
								this.alive.findIndex(
									dead => {
										
										return dead.name == port.name;
										
									}
								)
							);		
						}
					);
				}
			});

	this.storeNewDefs = (changes, area) => {
		
		if (area != "local")
	 		return;
		
		for (key of Object.keys(changes)) {
			
			if (key == "userdefs") 
				this.defs = changes.userdefs.newValue || "";			
		}
	};
	
	browser.storage.onChanged.addListener(this.storeNewDefs);
}
