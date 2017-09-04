function DomainArray (domains) {

	var self = this;
	
	Array.call(this, domains);
	
	// domains.forEach(domain => {
		
	// 	this.push(domain);
		
	// });
	
	this.get = function (domain_name) {

		return self.filter(domain => {
			return domain.name == domain_name;
		})[0];

	};

	this.erase = function (domain_name) {

		self.remove(self.findIndex(domain => {
					
			return domain.name == domain_name;
					
		}));
	};

	this.findScript = function (uuid) {

		for (domain of self) {

			var script = domain.findScript(uuid);
			
			if (script)
				return script;
			
		}

		return null;
	};
}

function DomainMgr (bg) {

	var self = this;

	this.bg = bg;
	this.storage = global_storage;
	this.domains = [];

	this.storage.__getDomains(new_domains => {

		if (new_domains)
			self.domains = new_domains;
		
	});

	this.__createParentFor = function (url) {

		var parent;
		
		if (url.pathname == "/")
			parent = new Domain ({name: url.hostname });
		else
			parent = new Domain ({name: url.hostname, sites: [{name: url.pathname}] }).sites[0];

		return parent;
	};
	
	this.getScriptsForUrl = function (url) {

		return new Promise ((resolve, reject) => {

			for (domain_name of self.domains) {

				if ( url.hostname == domain_name ) {

					self.storage.getDomain(domain => {
						
						var site = domain.haveSite(url.pathname);

						if (site)
							scripts = domain.scripts.concat(site.scripts);
						
						resolve(scripts);
						
					}, domain_name);

				}
				
			}

			resolve(null);
		});
	};

	this.createScriptForUrl = function (url) {
	
		return new Promise ((resolve, reject) => {
		
			self.storage.getOrCreateDomain(domain => {
						
				resolve(domain.getOrCreateSite(url.pathname).createScript());
						
			}, url.hostname || url.href);
			
		});
	};

	this.haveInfoForUrl = function (url) {

		return new Promise ((resolve, reject) => {

			for (domain_name of self.domains) {
				
				if ( url.hostname == domain_name) {
					
					global_storage.getDomain(domain => {
						
						if (domain.haveScripts() || domain.haveSite(url.pathname))
							resolve(true);
						
					}, domain_name);
				}
			}

			resolve(false);
			
		});

	};

	/* !!! */
	this.getEditInfoForUrl = function (url) {

		return new Promise ((resolve, reject) => {
					
			self.storage.getDomain(domain => {
				
				resolve(domain.getEditInfo(url.pathname));
				
			}, url.hostname);
		});
	};

	this.getFullDomains = function (done) {

		var res = new DomainArray();
		
		async.eachSeries(self.domains, (domain_name, cb) => {
			
			self.storage.getDomain(domain => {
				
				res.push(domain);
				cb();
				
			}, domain_name);
			
		}, () => {
			
			done(res);
			
		});
	};

	this.storeNewDomains = function (changes, action) {

		if (area != "local")
	 		return;

		if(changes.domains)
			self.domains = changes.domains.newValue;
	};
	
	browser.storage.onChanged.addListener(this.storeNewDomains);
}
