function ListenerWdw (tabInfo, bg) {

	let self = this;
	
	return new Promise (
		(resolve, reject) => {
			
			let listener = new JSLTabListener(tabInfo, bg);

			browser.windows.create({
				
				type: "popup",
				state: "normal",
				url: browser.extension.getURL("fg/listener/listener.html?" + listener.id),
				width: 1024, 
				height: 420 
				
			}).then (
				wdw => {
					
					listener.wdw = wdw;
					
					resolve (listener);
					
				}, reject);
					
		});
}

function JSLTabListener(tabInfo, bg) {

	let self = this;
	
	Object.assign(this, tabInfo);

	this.bg = bg;
	this.active = true;
	this.url = new URL(this.url).sort();
	this.id = parseInt(this.id);
	
	this.requests = [];
	this.filters = [];
	
	this.__findRequest = function(reqId) {
		
		return self.requests.find(
			req => {
				
				return req.request.requestId == reqId;
				
			}
		) || null;
		
	};

	this.__removeRequest = function(reqId) {

		self.requests.remove(
			self.requests.findIndex(
				req => {
					
					return req.request.requestId == reqId;
					
				}
			)
		);
	};
	
	this.addFilter = function (request, action) {
		
		self.filters.push(self.bg.rules_mgr.addRule({
			policy: action,
			criteria: [
				{ key: "url", value: request.url, comp: "=" },
				{ key: "method", value: request.method, comp: "=" },
				{ key: "type", value: request.type, comp: "=" }
			]
		}));
	};

	/* If proxy not found in option_mgr host will be "DIRECTED" */
	this.addProxyForTab = function (proxy) {
		
		self.bg.rules_mgr.addProxy(this.url.hostname, proxy);
		
	};

	/* If proxy not found in option_mgr host will be "DIRECTED" */
	this.addProxyForHost = function (proxy, url) {
		
		let host = new URL(url).hostname;
		
		self.bg.rules_mgr.addProxy(host, proxy);
		
	};

	this.getProxyName = function (proxy_object) {

		if (!proxy_object)
			return "None";
		
		for (let proxy of Object.keys(self.bg.option_mgr.jsl.proxys)) {
			
			let stored = self.bg.option_mgr.jsl.proxys[proxy]
			
			if ((stored.host == proxy_object.host) && (stored.port == proxy_object.port))
				return proxy;
		}
		
		return "None";
	};

	this.onHeadersReceived = function (response) {
		
		if (self.active) {
			
			if (response.tabId == self.id || response.tabId < 0) {
			
				let req = self.__findRequest(response.requestId);
			
				if (req) {
							
					req.responses.push(response);
					
					if (req.track)
						clearTimeout(req.track)
					
					/* 400 and 500 not to be tracked. Will get here? */
					if (response.statusCode >= 200 && response.statusCode < 300) {
						
						self.port.postMessage({ action: req.mod ? "modified-request" : "new-request", request: req });
						self.__removeRequest(response.requestId);
						
					} else {
						
						req.track = setTimeout(
							req => {
								
								self.port.postMessage({action: "error-request", request: req});
								self.__removeRequest(response.requestId);
								
							}, 3000, req
						);
					}
				
				} else {
					
					console.error(" --------------- Missing request ------------- ");
					console.error(response);
					console.error("------------------------------------------");
				}
			}
		}
	};
	
	this.bg.rules_mgr.events
		.on('sending-request',
			(request, rules, mod) => {
				
				if (self.active) {
					if (request.tabId == self.id || request.tabId < 0) {
						
						if (mod)
							request.modifiedHeaders = mod;
							
						self.requests.push({
							request: request,
							responses: [],
							rules: rules.map(rule => { return {id: rule.id, enabled: rule.enabled }}),
							mod: mod ? true : false
						});
					}
				}
			})

		.on('rule-match',
			(request, rules, action, redire) => {
				
				/* Data Clone Error when posting rules to view */
				
				if (self.active) {
					if (request.tabId == self.id || request.tabId < 0)  {
						
						switch(action) {
						case "block":
							
							self.port.postMessage({
								action: "blocked-request",
								request: {
									request: request,
									responses: [],
									rules: rules.map(rule => { return {id: rule.id, enabled: rule.enabled }})
								}
							});
							
							break;
							
						case "redirect":
							
							request.redirectedTo = redire;

							self.port.postMessage({
								action: "redirect-request",
								request: {
									request: request,
									responses: [],
									rules: rules.map(rule => { return {id: rule.id, enabled: rule.enabled }})
								}
							});
							
							break;
							
						default:
							break;
						}
						
					}
				}
			});
	
	this.listenerUnregister = function () {
		
		browser.webRequest.onHeadersReceived.removeListener(self.onHeadersReceived);

		/* Temp! */
		// for (let id of self.filters)
		// 	self.bg.rules_mgr.removeRule(id);
	};
	
	browser.runtime.onConnect
		.addListener(
			port => {
				
				if (port.name === ("tab-listener-" + self.id)) {
					
					self.port = port;
					
					/* Not firing on window close.. Obs.*/
					self.port.onDisconnect.addListener(
						port => {
							
							if (port.error)
								console.error("Disconnect error: " + port.error.message);
							
							console.log("Closing listener " + self.id);
						}
					);
					
					browser.webRequest.onHeadersReceived.addListener(self.onHeadersReceived,
																	 {urls: ["<all_urls>"]},
																	 [ "responseHeaders" ]);

				}
			}
		);
};

function JSLTab (tabInfo, feeding) {

	let self = this;
	
	Object.assign(this, tabInfo);
	
	this.url = new URL(this.url).sort();
	this.id = parseInt(this.id);
	
	this.feeding = feeding;
	this.run = function (scripts) {
		
		return new Promise(
			(resolve, reject) => {
				
				let pr = [];

				self.feeding(self.id)
					.then(
						frames => {
							
							for (let frame of frames) 
								pr.push(frame.run(scripts));

							Promise.all(pr).then(resolve, reject);
							
						}, reject);		
				
			});
	}
}

function TabsMgr (bg) {

	let self = this;

	this.bg = bg;
	this.listeners = [];

	this.__showPageAction = function (tabInfo) {

		return new Promise (
			(resolve, reject) => {

				browser.tabs.get(tabInfo.tabId || tabInfo)
					.then(
						tab => {
							
							var url = new URL(tab.url).sort();
							
							if (["http:", "https:"].includes(url.protocol)) {
								
								self.bg.domain_mgr.haveInfoForUrl(url) /* !! */
									.then(
										any => {
											
											if (any)
												browser.pageAction.show(tab.id).then(resolve, reject);
											else 
												browser.pageAction.hide(tab.id).then(resolve, reject);
											

										}, reject);	
								
							}
							
						}, reject);
			});
	};

	this.__updateEditors = function (tabId, changeInfo, tabInfo) {
		
		var url = new URL(tabInfo.url).sort();
					
		if (url.protocol != "moz-extension:") {
			
			if (changeInfo.url) {
				
				let editor = self.bg.editor_mgr.getEditorForTab(tabId);
				
				if (editor)
					editor.newTabURL(new URL(changeInfo.url).sort());
				
				// let listener = self.getListenerById(tabId);

				// if (listener)
				// 	listener.tabUpdate();
			}
		}
	};
	
	this.updateURLForTab = function (tabId, url) {

		return browser.tabs.update (tabId, {url: url.href});
	};
	
	this.getTabsForURL = function (url) {
		
		return new Promise(
			(resolve,reject) => {
				
				var url_name;
				
				if (typeof(url) == "string") {
					
					if (url.startsWith("*."))
						url_name = url;
					else
						url_name = new URL(url).name();
					
				} else
					url_name = url.name();

				if (url_name.slice(-1) == "/")
					url_name = url_name.slice(0, -1);
				
				browser.tabs.query({url: "*://" + url_name + "/*"})
					.then(
						tabs => {
							
							resolve(tabs);
							
						}
					);
			}
		)
	};

	this.getCurrentURL = function () {
		
		return new Promise (
			(resolve, reject) => {
			
				browser.tabs.query({currentWindow: true, active: true})
					.then(tab_info => {
						resolve(new URL(tab_info[0].url).sort());
					}, reject)
			}
		);
		
	};

	this.openOrCreateTab = function (url) {

		return new Promise (
			(resolve, reject) => {
						
				self.getTabsForURL(url)
					.then(
						tabs => {
							
							let tab = tabs[0];
							
							if (tab) {
								
								browser.tabs.update(tab.id, {active: true})
									.then(resolve, reject);

							} else {

								browser.windows.getAll({ populate: false, windowTypes: ['normal', 'panel'] })
									.then(wdws => {
										browser.tabs.create({active: true, url: url, windowId: wdws[0].id})
											.then(resolve, reject);
									});
							}
						});
			});
	};
	
	this.getListenerById = function (lid) {
		
		return self.listeners.find(
			listener => {

				return listener.id == lid;
				
			}) || null;
	}
	
	this.listenerClose = function (lid) {
		
		let idx = self.listeners.findIndex(
			listener => {
				
				return listener.id == lid;
				
			}
		);

		if (idx >= 0) {

			self.listeners[idx].listenerUnregister();
			self.listeners.remove(idx);
			
		} else
			console.error("Missing listener " + id);
		
	};

	this.openListenerInstance = function (tabInfo) {

		return new Promise(
			(resolve, reject) => {
				
				new ListenerWdw(tabInfo, self.bg)
					.then(
						listener => {

							self.listeners.push(listener);
							resolve(listener);

						}, reject);

			});
	};
	
	/* If any content script needs to run a script this method will be called, so no need to worry about it on "tabs.onUpdated" */
	this.updatePA = function (script) {

		let urls = [];

		switch (typeof(script)) {
			
		case "object":
			{
				
				let url = script.getUrl();
			
				if (url) /* parent instance of Site */
					urls.push(url);
				else if (script.parent.isSubdomain()) 
					urls.push(script.getParentName());
				else /* parent instance of Group */
					urls.push.apply(urls, script.parent.sites);
			}

			break;
			
		case "string":
			urls.push(script);
			break;

		default:
			break;
		}
		
		async.each(urls,
				   (url, next) => {

					   self.getTabsForURL(url)
						   .then(
							   tabs => {
								   async.each(tabs,
											  (tab, tab_next) => {
												  
												  self.__showPageAction(tab.id).then(tab_next, tab_next);
												  
											  },
											  err => {

												  if (err)
													  console.error("updatePA (tabs): " + err.message);
												  
												  next(err);
											  })
									   }
						   );
					   
				   },
				   err => {

					   if (err)
						   console.error("updatePA (urls): " + err.message);
					   
				   });
	};
	
	browser.tabs.onActivated.addListener(this.__showPageAction);
	browser.tabs.onUpdated.addListener(this.__updateEditors);
}
