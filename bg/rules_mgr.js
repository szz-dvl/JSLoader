function CriteriaAttr (opt) {

	this.key = opt.key || null;
	this.value = opt.value ? this.key.toLowerCase().includes("url") ? new URL(opt.value) : opt.value : null;
	this.comp = opt.comp || null;

	this.match = function (val) {

		let str = JSON.stringify(val);
		
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
}

function RuleCriteria (opt) {

	this.attributes = [];
	
	for (let attr of opt) {
		
		this.attributes.push(new CriteriaAttr(attr));
	}

	this.match = function (request) {

		return this.attributes.filter(
			attr => {
				
				return attr.match(request[attr.key]);
				
			}
			
		).length == this.attributes.length;
	}
}

function Rule (opt) {
	
	this.id = opt.id || UUID.generate().split("-").pop();
	this.criteria = opt.criteria ? new RuleCriteria(opt.criteria) : null;
	
	this.policy = opt.policy ? {action: opt.policy.action, data: opt.policy.data } : null;
	
	this.headers = opt.policy ? opt.policy.headers : [];
	this.enabled = true;
}

function RulesMgr (bg) {
	
	let self = this;
	
	this.bg = bg;
	this.storage = global_storage;
	this.rules = [];
	this.pending = [];
	this.events = new EventEmitter();
	
	this.storage.getRules(
		new_rules => {
			self.rules = new_rules.map(rule => { return new Rule(rule) });
		}
	);

	this.addProxy = function (hostname, proxy) {
		
		return browser.runtime.sendMessage(
			{host: hostname, proxy: proxy },
			{toProxyScript: true}
		);
	}
	
	this.addRule = function (rule) {

		let my_rule = new Rule(rule);
		
		self.rules.push(my_rule);
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
			this.pending.push({id: info.id, headers: info.rule.enabled ? info.rule.headers : [], rules: [info.rule]})
		
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
						
						/* Manually added headers missing! */
					}
					
					resolve({ requestHeaders: request.requestHeaders });
					self.pending.remove(idx);
					
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

	browser.proxy.onProxyError.addListener(error => {
		console.error(`Proxy error: ${error.message}`);
	});
	
	browser.runtime.onMessage.addListener(
		(message, sender, response) => {
			console.log("Proxy message: " + message);
		}
	);
	
	browser.proxy.register("pac.js");
	
	browser.webRequest.onBeforeRequest.addListener(self.applyRules,
												   {urls: ["<all_urls>"]},
												   ["blocking"]);

	browser.webRequest.onBeforeSendHeaders.addListener(self.changeHeaders,
													   {urls: ["<all_urls>"]},
													   ["blocking", "requestHeaders"]);
	
}
