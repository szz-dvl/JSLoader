function Rule (opt) {
	
	this.id = opt.id || UUID.generate().split("-").pop();
	this.criteria = opt.criteria || null;
	this.criteria.url = this.criteria.url ? new URL(this.criteria.url) : null;
	
	this.policy = opt.policy || null;
	this.enabled = true;
}

function RulesMgr (bg) {
	
	let self = this;
	
	this.bg = bg;
	this.storage = global_storage;
	this.rules = [];
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
	
	this.applyRules = function (request) {

		return new Promise (
			(resolve, reject) => {
				
				/* !!! */
				let rule = self.rules.find(
					rule => {
						
						return rule.criteria.url.match(new URL(request.url)) && rule.criteria.method == request.method && rule.criteria.type == request.type;
						
					}
				);

				if (rule) {
					
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
	
}
