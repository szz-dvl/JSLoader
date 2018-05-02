function ListenerWdw (tabInfo, bg) {

	let self = this;
	
	return new Promise (
		(resolve, reject) => {
			
			let listener = new JSLTabListener(tabInfo, bg);
			let wc = listener.url.hostname.length;
			
			browser.windows.create({
				
				type: "popup",
				state: "normal",
				url: browser.extension.getURL("fg/listener/listener.html"),
				width: Math.min(Math.max(1124, (850 + (wc * 15))), screen.width), 
				height: 480 
				
			}).then (
				wdw => {
					
					listener.wdw = wdw;

					/* 
					   Workaround to avoid blank windows: 
					   
					   @https://discourse.mozilla.org/t/ff57-browser-windows-create-displays-blank-panel-detached-panel-popup/23644/3 
					   
					 */
					
					var updateInfo = {
						
						width: wdw.width,
						height: wdw.height + 1, // 1 pixel more than original size...
						
					};
					
					browser.windows.update (wdw.id, updateInfo)
						.then(
							newWdw => {

								resolve (listener);
								
							}, reject);
					
				}, reject);
					
		});
}

function JSLTabListener(tabInfo, bg) {

	let self = this;
	
	Object.assign(this, tabInfo);

	this.bg = bg;
	this.url = new URL(this.url).sort();
	this.clipped = false;
	this.last = null;
	
	this.requests = [];
	this.filters = [];

	this.__findRequestIdx = function(reqId) {
		
		return self.requests.findIndex(
			req => {
				
				return req.request.requestId == reqId;
				
			}
		);
	};
	
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

	this.update = function (tabInfo, fromPA) {

		if (!self.clipped || fromPA) {
			
			Object.assign(self, tabInfo);
			self.url = new URL(self.url).sort();

			if (fromPA)
				self.clipped = false;

			let next = Math.min(Math.max(1124, (850 + (self.url.hostname.length * 15))), screen.width);
			
			if (next > self.wdw.width) {
				
				browser.windows.update (self.wdw.id, {
					
					width: next,
					height: self.wdw.height,
					
				}).then(
					newWdw => {
						
						self.bg.app_events.emit("listener-update", { url: self.url.hostname, id: self.id, fromPA: fromPA });
						
					}
				);
				
			} else {
				
				self.bg.app_events.emit("listener-update", { url: self.url.hostname, id: self.id, fromPA: fromPA });
				
			}
			
		} else if (self.clipped) {
			
			self.last = tabInfo;
		}
		
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
						
						/* 3xx codes here! */
						
						self.bg.app_events.emit("listener-view", { action: req.mod ? "modified-request" : "new-request", request: req });
						self.__removeRequest(response.requestId);
						
					} else {
						
						req.track = setTimeout(
							req => {
								
								self.bg.app_events.emit("listener-view", {action: "error-request", request: req});
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
	
	this.bg.app_events
		.on('sending-request',
			request => {
				
				if (self.active) {
					if (request.tabId == self.id || request.tabId < 0) {
						
						self.requests.push({
							request: request,
							responses: [],
							rules: [],
							mod: false
						});
					}
				}
			})
		
		.on('headers-request',
			(request, headers, rules) => {
			
				let idx = self.__findRequestIdx(request.requestId);
				
				self.requests[idx].request.requestHeaders = request.requestHeaders;
				
				if (headers) 
					self.requests[idx].request.modifiedHeaders = headers;

			})

		.on('rule-match',
			(request, rules, action, redire) => {
				
				/* Data Clone Error when posting rules to view */
				
				if (self.active) {
					if (request.tabId == self.id || request.tabId < 0)  {
						
						switch(action) {
							case "block":
								
								self.bg.app_events.emit("listener-view", {
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
								
								self.bg.app_events.emit("listener-view", {
									action: "redirect-request",
									request: {
										request: request,
										responses: [],
										rules: rules.map(rule => { return {id: rule.id, enabled: rule.enabled }})
									}
								});
								
								break;
								
							case "headers":

								self.requests.push({
									request: request,
									responses: [],
									rules: rules.map(rule => { return {id: rule.id, enabled: rule.enabled }}),
									mod: true
								});
								
							default:
								break;
						}
						
					}
				}
			})
		.on("listener-clipped",
			clipped => {
				
				self.clipped = clipped;

				if (!clipped && self.last) {
					
					Object.assign(self, self.last);
					self.url = new URL(self.url).sort();
					self.last = null;
					
					self.bg.app_events.emit("listener-update", { url: self.url.hostname, id: self.id, fromPA: false });
				}

			});
	
	this.listenerUnregister = function () {
		
		browser.webRequest.onHeadersReceived.removeListener(self.onHeadersReceived);
		self.requests.length = 0;
		self.filters.length = 0;
		
	};

	browser.webRequest.onHeadersReceived.addListener(self.onHeadersReceived,
		{urls: ["<all_urls>"]},
		[ "responseHeaders" ]);
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
	this.listener;
	
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

				url_name += (url_name.indexOf("/") < 0) ? "/" : "";

				browser.tabs.query({ url: [ "*://" + url_name + "*", "*://" + url_name ] })
					.then(resolve, reject);
			}
		)
	};
	
	this.getCurrentURL = function () {
		
		return new Promise (
			(resolve, reject) => {
			
				browser.tabs.query({ currentWindow: true, active: true })
					.then(
						tab_info => {
							
							resolve(new URL(tab_info[0].url).sort());

						}, reject);
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
		
	this.listenerClose = function () {

		if (self.listener) 
			self.listener.listenerUnregister();

		self.listener = null;
		
		if (!self.bg.app_events)
			self.bg.app_events = new EventEmitter();
	};

	this.openListenerInstance = function (tabInfo) {

		return new Promise(
			(resolve, reject) => {

				if (self.listener) {
					
					self.listener.update(tabInfo, true);
					
					browser.windows.update(self.listener.wdw.id, { focused: true })
						.then(
							wdw => {
							
								resolve(self.listener);
							
							});  
					
				} else {
					
					new ListenerWdw(tabInfo, self.bg)
						.then(
							listener => {
								
								self.listener = listener;
								resolve(listener);
								
							}, reject);
				}
				
			});
	};
	
	this.showPA = function (tabId, changeInfo, tabInfo) {
		
		browser.tabs.get(tabId.tabId || tabId)
			.then(
				tabInfo => {
		
					var url = new URL(tabInfo.url).sort();
					
					if (url.protocol != "moz-extension:") {
						
						self.bg.domain_mgr.haveInfoForUrl(url)
							.then(
								any => {
									
									let nfo = any ? "red" : "blue";
									
									browser.pageAction.show(tabInfo.id)
										.then(
											() => {
												
												browser.pageAction.setIcon(
													{
														path: {
															16: browser.extension.getURL("fg/icons/" + nfo + "-diskette-16.png"),
															32: browser.extension.getURL("fg/icons/" + nfo + "-diskette-32.png")
																
														},
														tabId: tabInfo.id
													}
												);
											}
										);
								}
							);
					}
					
				});
	};

	this.updateWdws = function (tabId, changeInfo) {

		browser.tabs.get(tabId.tabId || tabId)
			.then(
				tabInfo => {
					
					if (tabInfo.active) {
						
						var url = new URL(tabInfo.url).sort();
						
						if (url.protocol != "moz-extension:") {
							
							for (let editor of self.bg.editor_mgr.editors) 
								editor.newTab(tabInfo);
							
							if (self.listener) 
								self.listener.update(tabInfo, false);
							
						}
					}
					
				});
	};
	
	browser.tabs.onUpdated.addListener(this.updateWdws);
	browser.tabs.onActivated.addListener(this.updateWdws);
	
	browser.tabs.onUpdated.addListener(this.showPA);
	browser.tabs.onActivated.addListener(this.showPA);
}


