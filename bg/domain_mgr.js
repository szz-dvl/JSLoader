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

	this.__getRepresentedBy = function (hostname) {

		return new Promise (
			(resolve, reject) => {
				
				let subdomains = [];
				
				/* SubDomain scripts */
				var split = self.__isIPAddr(hostname) ? [] : hostname.split(".");
				var last;
				
				async.eachSeries(split.slice(1).reverse(),
					(actual, cb) => {
						
						let subdomain_name = last ? actual + "." + last : actual;
						last = actual;
						
						this.storage.getDomain(
							subdomain => {

								/* Add those to cache? ====> to be tested!*/
								if (subdomain) 
									subdomains.push(subdomain);
								
								cb();
								
							}, "*." + subdomain_name
						);
					},
					err => {
						
						if (err)
							reject(err);
						else
							resolve(subdomains);
						
					});
			});
	};

	this.__getGroupScripts = function (groups) {

		return new Promise (
			(resolve, reject) => {

				let scripts = [];

				async.eachSeries(groups,
					(group_name, next) => {
						
						this.storage.getGroup(
							group => {
								
								if (group) {

									group.cache = self.bg.group_mgr;
									
									scripts.push.apply(scripts,
										group.scripts);
									
								} else {
									console.warn("Missing group: " + group_name);
								}
								
								next();
								
							}, group_name
						);		
					},
					err => {
						
						if (err)
							reject(err);
						else
							resolve(scripts);
						
					});
			});
		
	};

	this.__getAggregatedScripts = function (groups, hostname) {

		return new Promise (
			(resolve, reject) => {
				
				let scripts = [];
				
				self.__getRepresentedBy(hostname)
					.then(
						subdomains => {
							
							for (let subdomain of subdomains) {
								
								scripts.push.apply(scripts,
									subdomain.scripts);
								
								groups.push.apply(groups,
									subdomain.groups);
								
							}
							
							self.__getGroupScripts(groups)
								.then(
									group_scripts => {
										
										scripts.push.apply(scripts,
											group_scripts);
										
										resolve(scripts);
										
									}, reject
								);
							
						}, reject
					);
			}
		);
	};
	
	this.getScriptsForUrl = function (url) {
	
		return new Promise (
			(resolve, reject) => {
				
				self.getOrBringCached(url.hostname)
					.then(
						domain => {
							
							let groups = [];
							let scripts = [];
							let sites = [];
							let site = null;
							
							if (domain) {
								
								/* Domain & Site scripts */
								scripts.push.apply(scripts,
									domain.scripts);
								
								groups.push.apply(groups,
									domain.groups);
								
								let path = "/";
								for (let endpoint of url.pathname.split("/").slice(1)) {

									path += endpoint;
									site = domain.haveSite(path);
									
									if (site)
										sites.push(site);

									path += "/";	
								}
										
								if (sites.length) {

									for (site of sites) {

										scripts.push.apply(scripts,
											site.scripts);
									
										groups.push.apply(groups,
											site.groups);
									}
								}
							}

							/* Group & Subdomain scripts */
							self.__getAggregatedScripts(groups.unique(), url.hostname)
								.then(group_scripts => {
									
									scripts.push.apply(scripts,
										group_scripts.filter(
											script => {
												return !script.disabledAt(url.name()); 
											}
										)
									);
									
									resolve(scripts);
									
								}, reject);
						});
			});
	};

	this.getEditInfoForUrl = function (url) {

		return new Promise (
			(resolve, reject) => {
				
				self.getOrBringCached(url.hostname)
					.then(
						domain => {

							let site = null;
							let sites = [];
							let groups = [];
							let editInfo = {
								
								domain: [],
								site: [], 
								subdomains: [],
								groups: []
							};		
								
							if (domain) {

								if (domain.scripts.length)
									editInfo.domain.push({ name: domain.name, scripts: domain.scripts });
								
								groups.push.apply(groups,
									domain.groups);

								let path = "/";
								for (let endpoint of url.pathname.split("/").slice(1)) {

									path += endpoint;
									site = domain.haveSite(path);
									
									if (site)
										sites.push(site);

									path += "/";	
								}
							}
							
							if (sites.length) {

								for (site of sites) {
									
									if (site.scripts.length)
										editInfo.site.push({ name: site.url, scripts: site.scripts });
								
									groups.push.apply(groups,
										site.groups);
								}
							}
							
							self.__getRepresentedBy(url.hostname)
								.then(
									subdomains => {
										
										for (let subdomain of subdomains) {
											
											if (subdomain.scripts.length)
												editInfo.subdomains.push({ name: subdomain.name, scripts: subdomain.scripts });
											
											groups.push.apply(groups,
												subdomain.groups);
											
										}
										
										groups = groups.unique();
										
										self.__getGroupScripts(groups).then(
											group_scripts => {
												
												for (let group of groups) {

													let filtered = group_scripts
														.filter(
															script => {
																return group == script.parent.name;
															});
													
													if (filtered.length)
														editInfo.groups.push({ name: group, scripts: filtered });
												}
												
												resolve(editInfo);
												
											}, reject
										);
										
									}, reject
								);
						});
				
			});
	};		
	
	this.importDomains = function (arr) {

		return new Promise(
			(resolve, reject) => {
				
				let promises = [];
				
				for (domain_info of arr) {
					
					promises.push(self.updateCache(domain_info));
					
				}
				
				Promise.all(promises)
					.then(
						merged_domains => {
							
							async.eachSeries(merged_domains,
								(domain, next) => {
									
									for (let group_name of domain.groups) {
										
										global_storage.getGroup(
											group => {
												
												if (group) {
													
													group.appendSite(domain);
													group.persist();
													
												} else {
													
													domain.groups.remove(domain.groups.indexOf(group_name));
												}
												
											}, group_name);
									}
									
									
									for (let site of domain.sites) {
										for (let group_name of site.groups) {
											
											global_storage.getGroup(
												group => {
													
													if (group) {
														
														group.appendSite(site);
														group.persist();
														
													} else {

														site.groups.remove(site.groups.indexOf(group_name));
													}
													
												}, group_name);
										}
									}

									domain.persist().then(persisted => { next() }, next);	
								},
								err => {
									
									if (err)
										reject(err);
									else {
										
										self.bg.group_mgr.reload();
										resolve();
									}
									
								});
						});
			});

	};

	this.clear = function () {

		async.each(self.domains,
				   (domain_name, next) => {

					   self.feeding(
						   domain => {
								   
							   domain.remove();
								   
						   }, domain_name);
					   
				   });
	};

	this.exportScripts = function (inline) {

		return new Promise(
			(resolve, reject) => {
				
				self.getAllItems().then(
					domains => {
						
						var text = ["["];
						
						for (domain of domains) {
							
							text.push.apply(text, JSON.stringify(domain.__getDBInfo()).split('\n'));
							text.push(",");
							
						}

						if (domains.length)
							text.pop(); //last comma
						
						text.push("]");
						
						if (inline)
							resolve(text);
						else
							resolve(browser.downloads.download({ url: URL.createObjectURL( new File(text, "scripts.json", {type: "application/json"}) ) }));
					}
				);
			});
	}
	
	this.haveInfoForUrl = function (url) {

		return new Promise (
			(resolve, reject) => {
				
				self.getOrBringCached(url.hostname)
					.then(
						domain => {

							let groups = [];
							
							if (domain && domain.scripts.length)

								resolve(true);

							else {

								let sites = [];
								let site = null;

								if (domain) {
									
									let path = "/";
									
									for (let endpoint of url.pathname.split("/").slice(1)) {

										path += endpoint;	
										site = domain.haveSite(path);
										
										if (site) {

											if (site.haveData())
												sites.push(site);
											
											groups.push.apply(groups,
												site.groups);
										}
										
										path += "/";	
									}
								}
									
								if (sites.length) {
									
									resolve(true);
									
								} else {

									if (domain) {
										
										groups.push.apply(groups,
											domain.groups);	
									}									
									
									self.__getRepresentedBy(url.hostname)
										.then(
											subdomains => {
												
												let scripts = [];
												
												for (let subdomain of subdomains) {

													
													scripts.push.apply(scripts,
														subdomain.scripts);
													
													groups.push.apply(groups,
														subdomain.groups);
													
												}
												
												if (scripts.length)

													resolve (true);

												else {

													self.__getGroupScripts(groups.unique())
														.then(
															group_scripts => {
																
																resolve(group_scripts.length > 0);
																
															}, reject
														);
												}
												
											}, reject
										);
								}
							}
						});
				
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
