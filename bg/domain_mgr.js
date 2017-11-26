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

	this.__isIPAddr = function (string) {

		/* source: https://stackoverflow.com/questions/4460586/javascript-regular-expression-to-check-for-ip-addresses */
		
		return string.match(/^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/);

	};

	this.__getSubdomains = function () {

		return self.domains.filter(
			domain_name => {

				return domain_name.startsWith("*.");
				
			}
		);
	};
	
	this.getScriptsForUrl = function (url) {
		
		return new Promise (
			(resolve, reject) => {
				
				self.getOrBringCached(url.hostname)
					.then(
						domain => {

							// console.log("Got domain: ");
							// console.log(domain);
							
							var groups = [],
								scripts = [];
							
							if (domain) {
								
								/* Domain & Site scripts */
								groups = domain.groups;
								var site = domain.haveSite(url.pathname);
								
								scripts = domain.scripts;
								
								if (site) {
									
									scripts.push.apply(scripts,
													   site.scripts);
									
									groups.push.apply(groups, site.groups);
								}

							}

							// console.log("Domain groups: ");
							// console.log(groups);
							
							/* SubDomain scripts */
							var split = self.__isIPAddr(url.hostname) ? [] : url.hostname.split(".");
							var last;
							
							async.eachSeries(split.slice(1).reverse(),
											 (actual, cb) => {
												 
												 var subdomain_name = last ? actual + "." + last : actual;
												 last = actual;
												 
												 this.storage.getDomain(
													 subdomain => {
														 
														 if (subdomain) {
															 
															 groups.push.apply(groups, subdomain.groups);
															 scripts.push.apply(scripts, subdomain.scripts);

														 }
														 
														 cb();
														 
													 }, "*." + subdomain_name
												 );
											 },
											 () => {
												 
												 // console.log("My groups: ");
												 // console.log(groups);

												 /* Group scripts */
												 async.eachSeries(groups,
																  (group, next) => {
																	  
																	  this.storage.getGroup(
																		  group => {
																			  
																			  if (group) {
																				  
																				  scripts.push.apply(scripts,
																									 group.scripts);
																			  } else 
																				  console.warn("Missing group: " + group);
																			  
																			  next();
																			  
																		  }, group
																	  );		
																  },
																  () => {
																	  
																	  resolve (scripts);
																	  
																  });
												 
											 });
						});
			});
	};
	
	this.haveInfoForUrl = function (url) {

		return new Promise (
			(resolve, reject) => {
				
				if (self.domains.includes(url.hostname)) {
					
					self.getOrBringCached(url.hostname)
						.then(
							domain => {
								
								resolve (!domain.getOrCreateSite(url.pathname).isEmpty());
								/* Add subdomains */
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

							/* must have the site, missing subdomains. */
							resolve(domain.haveSite(url.pathname));
							
						}
					);
			}
		);
	};

	this.getFullDomains = function (done) {

		/* Filtrar => haveData */
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

	/* !!! */
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
		}
	};
	
	browser.storage.onChanged.addListener(this.storeNewDomains);
}
