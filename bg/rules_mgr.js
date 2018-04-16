function CriteriaAttr (opt) {

	this.key = opt.key || null;
	this.value = opt.value || null;//opt.value ? this.key.toLowerCase().includes("url") ? new URL(opt.value) : opt.value : null;
	this.comp = opt.comp || null;

	this.match = function (val) {

		let str = JSON.stringify(val);
		
		if (this.val == '*')
			return true;
		
		switch (this.comp) {

		case "=":
			return val == this.value;
			
		case "!=":
			return val != this.value
			
		/* Includes */
		case ":":
			return str.includes(this.value.toString());
			
		case "!:":
			return str.includes(this.value.toString());
		}
	}

	this.__getDBInfo = function () {

		let self = this;
		
		return {
			
			key: self.key,
			value: self.value,
			comp: self.comp
			
		};
	}
}

function RuleCriteria (opt) {
	
	this.attributes = opt
		? opt.map(attr => {
			
			return new CriteriaAttr(attr);
			
		})
	: [];
	
	this.lenght = this.attributes.length;
	
	this.match = function (request) {
		
		return this.attributes.length
		
			 ? this.attributes.filter(
				 attr => {
					
					 return attr.match(request[attr.key]);
					
				 }
				
			 ).length == this.attributes.length
		
		: false;
	}

	this.remove = function (idx) {
		
		this.attributes.remove(idx);
		this.length --;
	}
	
	this.factory = function (attr) {

		let new_attr = new CriteriaAttr(attr);

		this.attributes.push(new_attr);
		this.length ++;
		
		return new_attr;
	}
}

function Rule (opt, parent) {

	this.mgr = parent;
	
	this.id = opt.id || UUID.generate().split("-").pop();
	this.criteria = new RuleCriteria(opt.criteria);
	
	this.policy = opt.policy ? { action: opt.policy.action, data: opt.policy.data } : {action: 'block', data: null};
	
	this.headers = opt.policy ? opt.policy.headers : [];
	this.enabled = true;
	
	this.temp = opt.temp || false;
	
	this.toggleEnabled = function () {	
		this.enabled = !this.enabled;
	};

	this.__getDBInfo = function () {
		
		let self = this;
		
		self.policy.headers = self.headers;
		
		return {
			
			id: self.id,
			criteria: self.criteria.attributes.map(
				crit => {
					
					return crit.__getDBInfo();
					
				}
			),
			
			policy: self.policy,
			enabled: self.enabled
		};
	}
}

function ProxyMgr (bg) {

	let self = this;
	
	this.proxy_rules = [];
	
	this.storage.getProxyRules(
		new_rules => {

			for (let prule of new_rules) {
				
				self.newProxy(prule.host, prule.proxy);
				
			}
		}
	);

	this.persistProxys = function () {
		
		if (self.perProID)
			clearTimeout(self.perProID);
		
		self.perProID = setTimeout(
			() => {
				
				self.storage.setProxyRules(self.proxy_rules);
				
			}, 800);
	};
	
	this.__proxyOps = function (hostname, proxy, to_persist) {
		
		let proxy_obj = self.bg.option_mgr.jsl.proxys[proxy];
		let stored = this.proxy_rules.findIndex(
			prule => {
				
				return prule.host == hostname;
				
			}
		);
		
		if (proxy_obj) {
			
			if (stored >= 0)
				this.proxy_rules[stored].proxy = proxy;
			else
				this.proxy_rules.push({ host: hostname, proxy: proxy });
			
		} else if (stored >= 0) /* Special keyword "None" will be treated here! */ 	
			this.proxy_rules.remove(stored);
		
		if (to_persist)
			self.persistProxys();
		
		return browser.runtime.sendMessage(
			{ host: hostname, proxy: proxy_obj },
			{ toProxyScript: true }
		);
	};
	
	this.addProxy = function (hostname, proxy) {

		return self.__proxyOps(hostname, proxy, true);
		
	};
	
	this.newProxy = function (hostname, proxy) {
		
		return self.__proxyOps(hostname, proxy, false);
		
	};

	this.proxyFactory = function () {
		
		self.proxy_rules.push({host: null, proxy: Object.keys(self.bg.option_mgr.jsl.proxys)[0]});
	};

	this.upsertProxy = function (hostname, proxy) {
		
		let exists = this.proxy_rules.findIndex(
			prule => {
				
				return prule.host == hostname;
				
			}
		);
		
		if (exists >= 0) {
			
			self.proxy_rules.remove(exists);
			return self.addProxy(hostname, proxy);	
		} 
		
		return self.newProxy(hostname, proxy);
	};

	this.tempProxy = function (hostname, proxy) {

		return new Promise(
			resolve => {
				
				let proxy_obj = typeof(proxy) == 'string'
											   ? self.bg.option_mgr.jsl.proxys[proxy]
											   : proxy;
				
				if (!proxy_obj || !proxy_obj.host || !proxy_obj.port || !proxy_obj.type)
					resolve(-1);
				else {
					
					browser.runtime.sendMessage(
						{ host: hostname, proxy: proxy_obj, temp: true },
						{ toProxyScript: true }
					).then(resolve);
				}
			});
	};
	
	browser.proxy.onProxyError.addListener(error => {
		console.error(`Proxy error: ${error.message}`);
	});
	
	browser.runtime.onMessage.addListener(
		(message, sender, response) => {
			console.log("Proxy message: " + message);
		}
	);
	
	browser.proxy.register("pac.js");
}

function RulesMgr (bg) {
	
	let self = this;
	
	this.bg = bg;
	this.storage = global_storage;
	this.rules = [];
	this.pending = [];
	this.events = new EventEmitter();
	ProxyMgr.call(this, bg);
	
	this.storage.getRules(
		new_rules => {
			self.rules = new_rules.map(rule => { return new Rule(rule, self) });
		}
	);

	this.clear = function () {

		this.storage.removeRules();
		this.storage.removeProxyRules();
		this.rules.length = 0;
		this.proxy_rules.length = 0;
	};
	
	this.persist = function () {
		
		if (self.perID)
			clearTimeout(self.perID);
		
		self.perID = setTimeout(
			() => {
				
				self.storage.setRules(self.rules.map(rule => { return rule.__getDBInfo() }).slice(0));
				
			}, 800);
	};
	
	this.addRule = function (rule) {
		
		let my_rule = new Rule(rule, self);

		let exists = self.rules.findIndex(
			rl => {

				return rl.id == rule.id;
				
			}
		);
		
		if (exists >= 0) {

			/* Importing rules */

			self.rules[exists] = my_rule;
			
		} else {

			self.rules.push(my_rule);
			
		}
		
		self.persist();
		
		return my_rule.id;
	};
	
	this.removeRule = function (rid) {
		
		self.rules.remove(
			self.rules.findIndex(
				rule => {
					return rule.id == rid;
				}
			)
		);

		self.persist();
	};
	
	this.tempRule = function (criteria, headers) {
		
		let rule = new Rule({
			
			criteria: criteria,
			policy: { action: 'headers', headers: headers },
			temp: true
			
		});

		self.rules.push(rule);
		
		return rule.id;
	};

	this.toggleEnable = function (rid) {
		
		let rule = self.rules.find(
			rule => {
				return rule.id == rid;
			}
		);

		if (rule)
			rule.enabled = !rule.enabled;
	};
	
	this.__mergeHeaders = function (actual, new_headers) {
		
		if (!new_headers)
			return actual;
		else {
			
			for (let header of actual) {
				
				let updated = new_headers.find(nw => { return nw.name == header.name; });
				
				if (updated)
					header.value = updated.value;	
			}
			
			actual.push.apply(actual, new_headers.filter(nw => { return !actual.find(ac => { return ac.name == nw.name; }); } ));
			
			return actual;
		}
	};
	
	this.upsertPending = function (info) {
		
		let pending = this.pending.find(
			pend => {

				return pend.id == info.id;	
			}
		);

		if (pending) {

			if (info.rule.enabled) 	
				pending.headers = self.__mergeHeaders(pending.headers, info.rule.headers)
			
			pending.rules.push(info.rule);
			
		} else
			this.pending.push({ id: info.id, headers: info.rule.enabled ? info.rule.headers : [], rules: [info.rule] });
	}

	this.discardPending = function (rid) {
		
		self.pending.remove(
			self.pending.findIndex(
				pending => {
					return pending.id == rid;
				}
			)
		);
	}
	
	this.importRules = function (imported) {

		for (let rule of imported.rules) {
			
			self.addRule(rule);
			
		}

		for (let prule of imported.proxy_rules) {
			
			self.addProxy(prule.host, prule.proxy);
			
		}
		
	}
	
	this.exportRules = function (inline) {

		let text = ["{\"rules\": ["];
		
		for (let rule of self.rules) {
			
			text.push.apply(text, JSON.stringify(rule.__getDBInfo()).split('\n'));
			text.push(",");
		}

		text.pop(); // last comma
		text.push("], \"proxy_rules\": [");

		for (let rule of self.proxy_rules) {
			
			text.push.apply(text, JSON.stringify(rule).split('\n'));
			text.push(",");
		}
		
		text.pop(); // last comma
		text.push("]}");
		
		//console.log("My text: " + text);

		if (inline)
			return text;
		else
			browser.downloads.download({ url: URL.createObjectURL( new File(text, "rules.json", {type: "application/json"}) ) });
	}
	
	this.changeHeaders = function (request) {

		return new Promise (
			resolve => {

				let headers = null;
				let rules = [];
				
				let idx = self.pending.findIndex(
					headers => {
						return headers.id == request.requestId;
					}
				);
				
				if (idx >= 0) {
					
					rules.push.apply(rules, self.pending[idx].rules);
					headers = self.pending[idx].headers;
						
					for (let header of headers) {
						
						let to_change = request.requestHeaders.find(head => { return head.name == header.name });
						
						if (to_change)
							to_change.value = header.value;
						else
							request.requestHeaders.push(header);
					}
					
					resolve({ requestHeaders: request.requestHeaders });
					self.pending.remove(idx);

					rules.filter(rule => { return rule.temp; } )
						.map(rule => { return rule.id })
						.forEach(id => {
							
							self.rules.remove(
								self.rules.findIndex(
									rule => {
										return rule.id == id;
									}
								)
							);	
						});
				} else 	
					resolve();
				
				self.events.emit("sending-request", request, rules, headers);
			}
		);
	};
	
	this.applyRules = function (request) {
		
		return new Promise (
			resolve => {
				
				let rules = self.rules.filter(
					rule => {
						
						return rule.criteria.match(request);
						
					}
				);

				if (rules.length) {

					let res_val = {};
					let action = null;
					let redirection = null;
					
					for (let rule of rules) {
						
						if (res_val.cancel) {

							res_val = { cancel: true };
							self.discardPending(request.requestId);
							
							break;
						}
						
						if (rule.headers)
							self.upsertPending({id: request.requestId, rule: rule });
						
						if (rule.enabled) {

							switch(rule.policy.action) {
								
							case "block":

								action = "block";
								res_val.cancel = true;
								break;
								
							case "redirect":

								redirection = rule.policy.data;
								action = "redirect";
								res_val.redirectUrl = rule.policy.data;
								break;
								
							default:
								break;
							}	
						} 
					}
					
					resolve(res_val);
					self.events.emit("rule-match", request, rules, action, redirection);
					
				} else
					resolve();
			});
	};
	
	browser.webRequest.onBeforeRequest.addListener(self.applyRules,
												   {urls: ["<all_urls>"]},
												   ["blocking"]);

	browser.webRequest.onBeforeSendHeaders.addListener(self.changeHeaders,
													   {urls: ["<all_urls>"]},
													   ["blocking", "requestHeaders"]);
	
}
