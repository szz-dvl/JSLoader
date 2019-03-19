function CS (port) {

	this.port = port;
	this.name = port.name;
	this.frame = port.sender || null;
	this.id = port.name.split("_").pop();
	this.history = [];
	this.resources = [];
	
	this.run = (scripts, action) => {
		
		return new Promise(
			resolve => {

				let my_response = action || "post-results";
				let my_listener = (args) => {
					
					if (args.action == my_response) {
						
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
					response: my_response,
					message: scripts.map(
						script => {
							
							return { code: script.code, id: script.uuid, name: script.name };
							
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
	
	this.addLoadedResource = (url) => {
		
		if (!this.resources.includes(url))
			this.resources.push(url);
	};

	this.removeLoadedResource = (url) => {
		
		this.resources.remove(
			this.resources.indexOf(url)
		);
	};

	this.isMainFrame = () =>  {

		return this.frame.url === this.frame.tab.url

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
	
	this.addSiteToGroup = (port, tag, site_name, group_name) => {
		
		var url;
		
		if (site_name.includes("://"))
			url = site_name.split("://").slice(1).join();
		else
			url = site_name;
		
		let regexh = new RegExp(/^(\*\.)?(?:[A-Za-z0-9\-]+\.)+(?:[A-Za-z1-9\-]+|(\*))$/).exec(url.split("/")[0]);
		let regexp = new RegExp(/^(?:[a-zA-Z0-9\.\-\_\~\!\$\&\'\(\)\+\,\;\=\:\@\/\*]*)?$/).exec(url.split("/").slice(1).join("/"));

		let newhost = regexh ? regexh[0] : null;
		let newpath = regexp ? regexp[0] : null;
		
		if (newhost && (newpath || newpath == "")) {
			
			this.bg.group_mgr.addSiteTo(group_name, url)
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
					},
					() => {

						this.__postTaggedResponse(port, tag,
							{
								status: false,
								content: {
									err: 'Group does not exists.',
									site: site_name,
									group: group_name
								}
							});
					}
				)
				
		} else {

			this.__postTaggedResponse(port, tag,
				{
					status: false,
					content: {
						err: "URL not understood.",
						site: site_name,
						group: group_name
					}
				});
		}
	}

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
		
		/* Policy: look for hits. */
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
	
	this.__contentSetProxy = (port, tag, host, proxy) => {
		
		this.bg.proxy_mgr.updatePAC(host, proxy)
			.then(
				host => {
					
					this.__postTaggedResponse(port, tag,
						
						{
							status: true,
							content: {
								proxy: proxy,
								host: host,
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

	this.focusMyTab = (port, tag) => {

		let cs = this.getFrameForPort(port);
		
		browser.tabs.update(cs.frame.tab.id, {active: true})
			.then(tab => {

				this.__postTaggedResponse(port, tag,
					
					{ status: true,
						
						content: {
							
							tid: cs.frame.tab.id
						}
					}
				);

			}, err => {
				
				this.__postTaggedResponse(port, tag,
						
					{ status: false,
						
						content: {
							
							err: err.message
						}
					}
				);
				
			});

	}

	this.contentLoadResource = (port, tag, name) => {

		let res = [];
		let frame = this.getFrameForPort(port);
		let error = false;
		
		this.bg.resource_mgr.loadResource(name)
			.then(urls => {
				
				if (((urls instanceof Array && urls.length) || (urls instanceof Object && urls)))
					frame.addLoadedResource(name);
				
				this.__postTaggedResponse(port, tag,
					
					{ status: ((urls instanceof Array && urls.length) || (urls instanceof Object && urls)),
						
						content: {
							
							urls: urls
						}
					}
				);
				
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

	this.contentUnloadResource = (port, tag, name) => {
		
		let frame = this.getFrameForPort(port);
		let error = false;

		this.bg.resource_mgr.unloadResource(name);
		frame.removeLoadedResource(name);
		
		this.__postTaggedResponse(port, tag,
			
			{ status: true,
						
				content: {
					
					unloaded: name
				}
			}
		);
	};

	this.contentImportAsResource = (port, tag, path, url, force) => {
		
		this.bg.resource_mgr.importAsResource(url, force, path)
			.then(
				resource => {
					
					this.__postTaggedResponse(port, tag,
						{
							status: true,
							content: {

								resource: resource.name

							} 
						}
					);
					
				}, err => {
					
					this.__postTaggedResponse(port, tag,
						{
							status: false,
							content: {
								
								err: err.message
								
							}
						}
					);
				}
			);
	};

	this.reloadScript = (script) => {

		this.alive.filter(

			frame => {

				return frame.history.find(
					record => {

						return record.id == script.uuid;
						
					}
				);

			}
			
		).forEach(
			frame => {

				frame.run([script]);
			
			}
		);	
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

										let cs = new CS(port);

										if (cs.isMainFrame()) {
											
											this.alive.push(cs);
											let defs = this.defs;
										
											port.postMessage({action: "info", message: defs });
										}
									}
									
									break;
									
								case "get-jobs":
									{
										
										let url = new JSLUrl(args.message.url);
										
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
																	
																	return { code: script.code, id: script.uuid, name: script.name };
																	
																}
															)
														});
													}
												}
											);
									}
									
									break;
								case "update-history":
									
									function status (script_id) {
										
										return args.errors.find(error => { return error.id == script_id }) ? false : true;
										
									};
									
									for(let script of args.run)
										this.getFrameForPort(port).updateHistory(script, status(script));
									
									if (!args.status) { 
										
										if (args.run[0] == 'UserDefs')
											this.bg.notify_mgr.error("Bad User Defs: " + args.errors[0].type + ": " + args.errors[0].message);
										
										if (args.inform) 
											this.bg.notify_mgr.error(args.errors[0].at + '\n'
												+ args.errors[0].type + ": " + args.errors[0].message + '[' + args.errors[0].line + ',' + args.errors[0].col + ']');
											
										if (args.unhandled && this.bg.pa_events)
											this.bg.pa_events.emit('new-status', args.errors[0], !args.inform);
											
									}
									
									break;
									
								case "site-to-group":
									this.addSiteToGroup(port, args.tag, args.message.site, args.message.group);
									break;
									
								case "notify":
									this.bg.notify_mgr.user(args.message.title, args.message.body);
									break;

								case "load-resource":
									this.contentLoadResource(port, args.tag, args.message.path);
									break;

								case "unload-resource":
									this.contentUnloadResource(port, args.tag, args.message.path);
									break;
									
								case "import-resource":
									this.contentImportAsResource(port, args.tag, args.message.path, args.message.url, args.message.force);
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
									this.__contentSetProxy(port, args.tag, args.message.host, args.message.proxy);
									break;
									
								case "download-file":
									this.contentDownload(port, args.tag, args.message.args);
									break;

								case "focus-tab":
									this.focusMyTab(port, args.tag);
									break;

								case "print":
									console.log(args.message.data);
									break;
									
								case "error":
									console.error(args.message.data);
									break;
									
								default:
									break;
							}
						}
					);
					
					port.onDisconnect.addListener(
						port => {

							let frame = this.getFrameForPort(port);

							if (frame) {

								for (let loaded of frame.resources) 
									this.bg.resource_mgr.unloadResource(loaded);

								/* Check for error */
								this.alive.remove(
									this.alive.findIndex(
										dead => {
										
											return dead.name == port.name;
											
										}
									)
								);
							}
						}
					);
				}
			});

}
