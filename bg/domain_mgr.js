function DomainMgr (bg) {

	var self = this;

	this.bg = bg;
	this.storage = global_storage;
	this.domains = []; /* Known domain names. */
	this.cache = []; /* Alive instances. */
	

	this.storage.__getDomains(
		new_domains => {

			if (new_domains)
				self.domains = new_domains;
		
		}
	);

	this.__createParentFor = function (url) {
		
		var parent;
		
		if (url.pathname == "/")
			parent = new Domain ({name: url.hostname });
		else
			parent = new Domain ({name: url.hostname, sites: [{url: url.pathname}] }).sites[0];
		
		self.cacheDomain(parent.parent);
		
		
		return parent;
	};
	
	this.getScriptsForUrl = function (url) {

		return new Promise (
			(resolve, reject) => {

				if (self.domains.includes(url.hostname)) {
					
					self.getOrBringCached(url.hostname)
						.then(
							domain => {
								
								var site = domain.haveSite(url.pathname),
									scripts = domain.scripts.filter(
										script => {
											
											return !script.disabled;
											
										}
									);
						
								if (site) {
									scripts.push.apply(scripts,
													   site.scripts.filter(
														   script => {
															   return !script.disabled;
														   }
													   ));
								}
	
								resolve(scripts);
							}
						);
				} else 
					resolve(null);
			}
		);
	};

	this.storeScript = function (script) {
		
		return new Promise (
			(resolve, reject) => {

				var url = script.getUrl();
					
				if (self.domains.includes(url.hostname)) {
					
					self.getOrBringCached(url.hostname || url.href)
						.then(
							domain => {
								
								// console.error("Domain: ");
								// console.error(domain);
								resolve(domain.getOrCreateSite(url.pathname).upsertScript(script));
								
							}
						);
					
				} else
					resolve(self.__createParentFor(url).upsertScript(script));
			}
		);
	};
	
	this.haveInfoForUrl = function (url) {

		return new Promise (
			(resolve, reject) => {
				
				if (self.domains.includes(url.hostname)) {
					
					self.getOrBringCached(url.hostname)
						.then(
							domain => {

								console.log ("Info for " + domain.name + " " + (domain.isEmpty() ? "Empty." : "OK."));
								resolve (!domain.isEmpty());
							}
						);
					
				} else
					resolve(false);	
			}
		);
	};

	this.getOrBringCached = function (domain_name) {

		var cached = self.cache.filter(
			cached => {
				return cached.name == domain_name;
			}
		)[0];

		if (cached) 
			return Promise.resolve(cached);	
		else
			return self.getAndCacheDomain(domain_name);
		
	};
	
	this.getEditInfoForUrl = function (url) {

		return new Promise (
			(resolve, reject) => {
					
				self.getOrBringCached(url.hostname)
					.then(
						domain => {
							
							resolve(domain.getOrCreateSite(url.pathname));
							
						}
					);
			}
		);
	};

	this.removeCached = function (domain_name) {
		
		// console.log("Remove from cache: " + domain_name);
		self.cache.remove(
			self.cache.findIndex(
				cached => {
					return cached.name == domain_name;
				}
			)
		);

		self.bg.option_mgr.sendMessage("cache-update", domain_name);
	}

	this.getAndCacheDomain = function (domain_name) {

		return new Promise (
			(resolve, reject) => {
				
				self.storage.getDomain(
					domain => {
						
						self.cacheDomain(domain);
						resolve(domain);
						
					}, domain_name
				);
			}
		);
	};
	
	this.cacheDomain = function (domain) {
		
		var cached = self.cache.filter(
			cached => {
				return cached.name == domain.name;
			}
		)[0];

		return cached ? false : self.cache.push(domain);
		
		//self.bg.option_mgr.sendMessage("cache-update", domain.name); /* !!! */

		//return ret;
	};

	this.getCachedNames = function () {
		
		return self.cache.map(
			cached => {
				return cached.name;
			}
		); 
	};

	/* Only when importing domains, "cache-update" message will be broadcasted by "storeNewDomains" on domain persist. */
	this.updateCache = function (domain) {

		self.getOrBringCached(domain.name)
			.then(
				cached => {
	
					if (Object.keys(cached).length)
						cached.mergeInfo(domain);			
					else {
						
						self.cacheDomain(domain);
						domain.persist();
					}
				}
			);
	};
	
	this.getFullDomains = function (done) {

		var missing = _.difference(self.domains, self.getCachedNames());
		
		async.eachSeries(missing,
						 (domain_name, cb) => {
							 
							 self.getAndCacheDomain(domain_name)
								 .then(
									 domain => {
										 
										 cb();
									 
									 }
								 );
						 },
						 () => {
							 
							 done(self.cache);
							 
						 });
	};

	this.importDomains = function (arr) {
		
		for (domain_info of arr)
			self.updateCache(new Domain (domain_info));
			
	};
	
	this.storeNewDomains = function (changes, area) {
		
		if (area != "local")
	 		return;
		
		for (key of Object.keys(changes)) {
			
			if (key == "domains") 
				self.domains = changes.domains.newValue || [];
			else if (key.includes("domain-")) {
				
				/* domain removed */
				if (!changes[key].newValue)
					self.removeCached(changes[key].oldValue.name);
				else
					self.bg.option_mgr.sendMessage("cache-update", changes[key].newValue.name);
			}
			
		}
	};
	
	browser.storage.onChanged.addListener(this.storeNewDomains);
}
