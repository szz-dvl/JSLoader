function CSMgr (bg) {
	
	var self = this;

	this.bg = bg;
	this.alive = [];
	
	this.addDomainToGroup = function (port, domain_name, group_name) {


		if (domain_name[domain_name.length - 1] != "/")
			domain_name += "/";
	
		self.bg.group_mgr.addSiteTo(group_name, domain_name);

	}

	this.addSiteToGroup = function (port, site_name, group_name) {

		self.bg.group_mgr.addSiteTo(group_name, site_name);

	}

	this.notifyUser = function (port, title, message) {

		self.bg.notifyUser(title, message);

	}

	browser.runtime.onConnect
		.addListener(
			port => {
				
				if (port.name === 'content-script') {

					self.alive.push(port);
					
					port.onMessage.addListener(
						args => {
							
							switch (args.action) {
							case "domain-to-group":
								self.addDomainToGroup(port, args.message.domain, args.message.group);
								break;
							
							case "site-to-group":
								self.addSiteToGroup(port, args.message.site, args.message.group);
								break;

							case "notify":
								self.notifyUser(port, args.message.title, args.message.body);
								break;

							case "event":

								self.alive.map(
									port => {

										try {

											port.postMessage({action: "content-script-ev", message: {name: args.message.name, args: args.message.args}});

										} catch (e) {}
									}
								);
								
								break;
								
							default:
								break;
							}
						}
					);
					
				}
			});

}
