function Rule (opt) {
	
	this.id = opt.id || UUID.generate().split("-").pop();
	this.criteria = opt.criteria || null;
	this.criteria.url = this.criteria.url ? new URL(this.criteria.url) : null;
	
	this.policy = opt.policy || null;
	
	this.headers = this.policy ? this.policy.headers : null;
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
		
		// console.log("Adding rule: ");
		// console.log(my_rule);
		
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

	this.changeHeaders = function (request) {

		return new Promise (
			resolve => {

				let rule = null;
				
				let idx = self.pending.findIndex(
					headers => {
						
						return headers.id == request.requestId;
					}
				);
				
				if (idx >= 0) {

					rule = self.pending[idx].rule;
					
					if (rule.enabled) {
						
						for (let header_name of Object.keys(self.pending[idx].headers)) {
							
							let value = self.pending[idx].headers[header_name];
							
							let to_change = request.requestHeaders.find(head => { return head.name == header_name });
							
							if (to_change)
								to_change.value = value;
						}
						
						resolve({ requestHeaders: request.requestHeaders });
						self.pending.remove(idx);
						
					} else 
						resolve();
					
				} else 	
					resolve();
				
				self.events.emit("sending-request", request, rule);
			}
		);
	};
	
	this.applyRules = function (request) {

		return new Promise (
			resolve => {
				
				/* !!! */
				let rule = self.rules.find(
					rule => {
						
						return rule.criteria.url.match(new URL(request.url)) && rule.criteria.method == request.method && rule.criteria.type == request.type;
						
					}
				);

				if (rule) {

					if (rule.headers)
						self.pending.push({id: request.requestId, headers: rule.headers, rule: rule });
					
					if (rule.enabled) {

						switch(rule.policy.action) {
							
						case "block":
							
							resolve({ cancel: true });
							break;
						
						case "redirect":
						
							resolve({ redirectUrl: rule.policy.data });
							break;

						default:
							
							resolve();
							break;
						}
						
					} else
						resolve();
					
					self.events.emit("rule-match", request, Object.assign({}, rule));
					
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
