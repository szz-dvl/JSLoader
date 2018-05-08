function DomainMgr (bg) {

	let self = this;

	DataMgr.call(this, { key: "Domain" });
	
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
							
							self.bg.group_mgr.getGroupScripts(groups)
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
				
				self.storage.getDomain(
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
						
					}, url.hostname);
			});
	};

	this.getEditInfoForUrl = function (url) {

		return new Promise (
			(resolve, reject) => {

				self.storage.getDomain(
					domain => {

						let site = null;
						let sites = [];
						let groups = [];
						let editInfo = {
							
							site: [], 
							subdomains: [],
							groups: []
						};		
						
						if (domain) {
							
							if (domain.scripts.length)
								editInfo.site.push({ name: "/", scripts: domain.scripts });
							
							groups.push.apply(groups,
								domain.groups);

							let path = "/";
							for (let endpoint of url.pathname.split("/").slice(1)) {
								
								path += endpoint;
								site = domain.haveSite(path);
								
								if (site && site.url != "/")
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
									
									self.bg.group_mgr.getGroupScripts(groups).then(
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
						
					}, url.hostname);	
			});
	};		

	this.importData = function (items) {

		return new Promise(
			(resolve, reject) => {

				async.eachSeries(items,
					(item, next) => {
						
						self.storage.getOrCreateDomain(
							domain => {
								
								domain.mergeInfo(item);								

								/* !!! */
								for (let group_name of domain.groups) {
									
									self.storage.getGroup(
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
										
										self.storage.getGroup(
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
								
							}, item.name);
						
					}, err => {

						if (err)
							reject(err);
						else
							resolve();
						
					});
			});
	};
	
	this.__updateParentFor = function (script, url) {

		return new Promise (
			(resolve, reject) => {
				
				script.remove()
					.then(
						() => {
							
							var pathname, hostname;
							
							try {
								
								let temp = new URL("http://" + url);
								
								pathname = temp.pathname;
								hostname = temp.hostname;
								
							} catch (e) {
								
								/* All subdomains shortcut. */
								
								hostname = url; 
								pathname = null;
								
							}
							
							self.storage.getOrCreateDomain(
								domain => {
									
									resolve(domain.getOrCreateSite(pathname).upsertScript(script));
									
								}, hostname);
							
						}, reject
					);
			});
	};

	/* Validated "url" strings must come here. */
	this.updateParentFor = function (script, url) {
		
		try {
			
			let my_url = new URL ("http://" + url);
			
			if (script.parent && my_url.match(script.getUrl())) 
				return Promise.resolve(script);
			else
				return self.__updateParentFor(script, url);
			
		} catch (e) {
			
			if (e instanceof TypeError) {
				
				if (script.parent && script.parent.isSubdomain())
					return script.parent.name == url ? Promise.resolve(script) : self.__updateParentFor(script, url); 
				else 
					return self.__updateParentFor(script, url);
			}
		}
	};	
	
	this.haveInfoForUrl = function (url) {

		return new Promise (
			(resolve, reject) => {
				
				self.storage.getDomain(
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

									/* !!! */
									if (site && site.url != "/") {

										if (site.haveData())
											sites.push(site);
										
										groups.push.apply(groups,
											site.groups);
									}
									
									path += "/";	
								}
							}
							
							if (sites.length) {

								for (let site of sites) {

									if (url.pathname.slice(1).startsWith(site.url.slice(1))) 
										resolve(true);	
								}
								
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

												self.bg.group_mgr.getGroupScripts(groups.unique())
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
						
					}, url.hostname);
				
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
