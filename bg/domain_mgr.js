function DomainMgr (bg) {

	var self = this;

	Cache.call(this, {feeding: global_storage.getDomain, birth: global_storage.getOrCreateDomain, key: "domains"});
	
	this.bg = bg;
	this.storage = global_storage;
	this.domains = []; /* Index */

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
		
		self.cacheItem(parent.parent);
		
		return parent;
	};
	
	this.getScriptsForUrl = function (url) {

		console.log("Got url: ");
		console.log(url);
		
		return new Promise (
			(resolve, reject) => {
				
				self.getOrBringCached(url.hostname)
					.then(
						domain => {

							console.log("Got domain: ");
							console.log(domain);
							
							var groups = [],
								scripts = [];
							
							if (domain) {
								
								/* Domain & Site */
								groups = domain.groups;
								var site = domain.haveSite(url.pathname);
								
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
									
									groups.push.apply(groups, site.groups);
								}

							}

							console.log("Domain groups: ");
							console.log(groups);
							
							/* SubDomains */
							var split = url.hostname.split(".");
							var last;
							
							async.eachSeries(split.slice(1).reverse(),
											 (actual, cb) => {

												 var subdomain_name = last ? actual + "." + last : actual;
												 last = actual;
												 
												 this.storage.getSubDomain(
													 subdomain => {
														 
														 if (subdomain) 
															 groups.push.apply(groups, subdomain.groups);
														 
														 cb();
														 
													 }, subdomain_name
												 );
											 },
											 () => {

												 console.log("My groups: ");
												 console.log(groups);
												 
												 async.eachSeries(groups,
																  (group, gcb) => {
																	  
																	  this.storage.getGroup(
																		  group => {
																			  
																			  if (group) {
																				  
																				  scripts.push.apply(scripts,
																									 group.scripts.filter(
																										 script => {
																											 return !script.disabled;
																										 }
																									 ));
																			  } else 
																				  console.warn("Missing group: " + group);
																			  
																			  gcb();
																			  
																		  }, group
																	  );		
																  },
																  () => {
																	  
																	  resolve (scripts);
																	  
																  });
												 
											 });
						}
					);
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

	/* Falta groups! */
	this.haveInfoForUrl = function (url) {

		return new Promise (
			(resolve, reject) => {
				
				if (self.domains.includes(url.hostname)) {
					
					self.getOrBringCached(url.hostname)
						.then(
							domain => {
								
								console.log ("Info for " + domain.name + " " + (domain.isEmpty() ? "Empty." : "OK."));
								console.log(domain);
								
								resolve (!domain.isEmpty());
							}
						);
					
				} else
					resolve(false);	
			}
		);
	};

	/* Falta groups! */
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

	/* ¿Falta groups? */
	this.getFullDomains = function (done) {

		var missing = _.difference(self.domains, self.getCachedNames());
		
		async.each(missing,
				   (domain_name, cb) => {
					   
					   self.getAndCacheItem(domain_name)
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

	this.clear = function () {

		self.getFullDomains(
			domains => {

				for (domain of domains)
					domain.remove();
				
			});
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
					self.bg.option_mgr.sendMessage("cache-update-domains", changes[key].newValue.name);
			}
			
		}
	};
	
	browser.storage.onChanged.addListener(this.storeNewDomains);
}
