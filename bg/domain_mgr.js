function DomainMgr (bg) {

	DataMgr.call(this, { key: "Domain" });
	
	this.bg = bg;
	this.storage = global_storage;
	this.domains = []; /* Index */
	this.disabled_domains = [];
	
	this.storage.__getDomains(
		new_domains => {
			
			this.domains = new_domains.info;
			this.disabled_domains = new_domains.disabled;

		}, false
	);
	
	this.__isIPAddr = (string) => {
		
		/* @ https://stackoverflow.com/questions/4460586/javascript-regular-expression-to-check-for-ip-addresses */
		
		return string.match(/^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/);
		
	};
	
	this.__getSubdomains = () => {
		
		return this.domains.filter(
			domain_name => {
				
				return domain_name.startsWith("*.");
				
			}
		);
	};

	this.__isDisabled = (hostname) => {

		
		return hostname ? this.disabled_domains.includes(hostname) : true;
		
	};
	
	this.toggleDisableFor = (domain_name) => {

		if (this.disabled_domains.includes(domain_name))
			this.disabled_domains.remove(this.disabled_domains.indexOf(domain_name));
		else
			this.disabled_domains.push(domain_name);
		
		this.storage.setDisabledDomains(this.disabled_domains);
	};

	this.__getNamesFor = (hostname) => {

		let names = [];
		let split = this.__isIPAddr(hostname) ? [] : hostname.split(".");
		let aux = split.slice(1);

		/* Add *.domainname.pdomainname able to detect domainname.pdomainname */
		
		while (aux.length) {
					
			names.push("*." + aux.join("."));
			aux = aux.slice(1);
		}
		
		aux = split.slice(0, -1);
		
		while (aux.length) {
			
			names.push(aux.join(".") + ".*");	
			aux = aux.slice(0, -1);
		}

		aux = split.slice(1).slice(0, -1);
				
		while (aux.length) {
					
			names.push("*." + aux.join(".") + ".*");	
			aux = aux.slice(1).slice(0, -1);
		}

		return names;
		
	};
	
	this.__getRepresentedBy = (hostname) => {
		
		return new Promise (
			(resolve, reject) => {
				
				let domains = [];
				let names = this.__getNamesFor(hostname);
				
				async.eachSeries(names,
					(actual, cb) => {
						
						this.storage.getDomain(
							subdomain => {
								
								if (subdomain) 
									domains.push(subdomain);
								
								cb();
								
							}, actual
						);
					},
					err => {
						
						if (err)
							reject(err);
						else 
							resolve(domains);
					});
			});
	};

	this.__getSitesInfoFor = (domain, pname) => {
		
		let res = { scripts: [] };
		let pathname = pname.split("/").slice(1).join("/");
		let path = "/";
		
		if (domain.scripts.length)
			res.scripts.push({ name: "/", scripts: domain.scripts }); 
		
		if (pathname) {
			
			for (let endpoint of pathname.split("/")) {
				
				path += endpoint;
				site = domain.haveSite(path);
				
				if (site) {
					
					if (site.scripts.length)
						res.scripts.push({ name: site.url,  scripts: site.scripts });

				}

				path += "/";
				
			}
		}
		
		return res;
	};

	this.__getAllSitesInfoFor = (domain, pname) => {
		
		let res = { scripts: [] };
		let pathname = pname.split("/").slice(1).join("/");
		let path = "/";
		
		if (domain.scripts.length)
			res.scripts.push({ name: "/", scripts: domain.scripts, included: true });
		
		for (site of domain.sites) {

			if (site.scripts.length)
				res.scripts.push({ name: site.url,  scripts: site.scripts, included: pname.startsWith(site.url) });			
		}
		
		return res;
	};

	this.__getAggregatedScripts = (url) => {
		
		return new Promise (
			(resolve, reject) => {
				
				let scripts = [];
				
				this.__getRepresentedBy(url.hostname)
					.then(
						subdomains => {
							
							for (let subdomain of subdomains) {
								
								let info = this.__getSitesInfoFor(subdomain, url.pathname);
								
								scripts.push.apply(scripts,
									info.scripts.reduce((val, nval) => { return val.concat(nval.scripts); }, []));
								
							}

							this.bg.group_mgr.getGroupScriptsForUrl(url)
								.then(
									group_scripts => {
										
										scripts.push.apply(scripts, group_scripts);

										resolve(scripts);

									}, reject
								);
								
						}, reject
					);
			}
		);
	};

	this.__removeSite = (hostname, pathname) => {

		return new Promise(
			(resolve, reject) => {
				
				this.storage.getDomain(
					domain => {
						
						if (domain) {

							let sites = this.__getSitesInfoFor(domain, pathname);

							let promise = Promise.resolve();
							
							for (site_tuple of sites.scripts) {

								promise = domain.removeSite(site_tuple.name);
								
							}

							promise.then(() => {

								this.bg.group_mgr.cleanSite(hostname + pathname)
									.then(resolve, reject);
							
							});
							
							
						} else {
							
							reject(new Error("Domain " + hostname + " not found."));
							
						}
						
					}, hostname
				);			
			})
	}
	
	this.removeSite = (hostname, pathname) => {

		return new Promise(
			(resolve, reject) => {
				
				async.each(this.__getNamesFor(hostname).concat(hostname),
					(name, next) => {
						
						this.__removeSite(name, pathname)
							.then(next, err => { next(); });
						
					}, err => {
						
						if (err)
							reject(new Error ("Error removing site: \"" + hostname + "\""));
						else
							resolve();
						
					});
			});
	};
	
	this.getScriptsForUrl = (url) => {
		
		return new Promise (
			(resolve, reject) => {
				
				this.storage.getDomain(
					domain => {
						
						let groups = [];
						let scripts = [];
						let sites = [];
						let site = null;
						let domain_disabled = false;

						if (!this.__isDisabled(url.hostname)) {
							
							if (domain) {
								
								let sites = this.__getSitesInfoFor(domain, url.pathname);
		
								/* Domain & Site scripts */
								
								scripts.push.apply(scripts,
									sites.scripts.reduce((val, nval) => { return val.concat(nval.scripts); }, []));
								
							}
							
							/* Group & Subdomain scripts: refac*/
							this.__getAggregatedScripts(url)
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
							
						} else {
							
							resolve([]);	
							
						}
						
					}, url.hostname);
			});
	};
	
	this.getEditInfoForUrl = (url) =>  {
		
		let self = this;
		
		return new Promise (
			(resolve, reject) => {
				
				this.storage.getDomain(
					domain => {
						
						let editInfo = {
							
							domains: [],
							groups: [],
							disabled: self.__isDisabled(url.hostname),
							
						};		
						
						this.__getRepresentedBy(url.hostname)
							.then(
								subdomains => {
									
									if (domain)
										subdomains.push(domain);
									
									for (let subdomain of subdomains) {

										let info = this.__getAllSitesInfoFor(subdomain, url.pathname);

										if (info.scripts.length) {

											editInfo.domains.push({

												title: subdomain.name,
												list: info.scripts
													.sort((a,b) => { return a.name > b.name; })
													.sort((a,b) => { return b.included - a.included; })
													.slice(0, 5)
													.map(
														nfo => {

															return {
																
																name: nfo.name,
																scripts: nfo.scripts.sort(
																	(a,b) => {
																		
																		return a.uuid > b.uuid;
																		
																	}).slice(0, 5),
																included: nfo.included,
																actual: 0,
																total: nfo.scripts.length
															};	
														}
													),
												in_storage: subdomain.in_storage,
												actual: 0,
												total: info.scripts.length
											});
											
										}
										
									}
		
									this.bg.group_mgr.getGroupsForUrl(url)
										.then(groups => {

											let title = this.bg.texts.findText('groups');
											
											editInfo.groups.push({
										
												title: title,
												actual: 0,
												total: groups.length,
												list: []

											});
									
											for (group of groups.sort((a,b) => { return a.name > b.name; }).slice(0, 5)) {
												
												editInfo.groups[0].list.push({
													name: group.name,
													in_storage: group.in_storage, 
													actual: 0,
													total: group.scripts.length,
													included: true,
													scripts: group.scripts.sort(
														(a,b) => {
															
															return a.uuid > b.uuid;

														}).slice(0, 5) });
											}
											
											resolve(editInfo);
											
										}, console.error);
									
								}, console.error
							);
						
					}, url.hostname);
			});
	};
	
	this.getPASliceFor = (start, len, target, path, index) => {
		
		return new Promise(
			(resolve, reject) => {
				
				this.getItem(target)
					.then(
						item => {
							
							let info = this.__getAllSitesInfoFor(item, path.pathname);
							
							resolve(
								{
									
									name: target,
									sites: info.scripts
										.sort((a,b) => { return a.name > b.name; })
										.sort((a,b) => { return b.included - a.included; })
										.slice(start, start + len)
										.map(
											nfo => {

												let first = this.__getFirstFor(target, nfo.name, index);
												
												return {
													
													name: nfo.name,
													scripts: nfo.scripts.sort(
														(a,b) => {
															
															return a.uuid > b.uuid;
															
														}).slice(first, first + 5),
													included: nfo.included,
													actual: 0,
													total: nfo.scripts.length
												};
												
											}
										),
									actual: start,
									total: info.scripts.length
								}
							);
							
						}, err => {

							resolve({total: 0});

						});
			});
	}
	
	this.__updateParentFor = (script, url) => {
		
		return new Promise (
			(resolve, reject) => {
				
				script.remove() /* BUG: new created domains */
					.then(
						() => {
							
							var pathname, hostname;
							
							try {
								
								let temp = new URL("http://" + url);
								
								pathname = temp.pathname;
								hostname = temp.hostname;
								
							} catch (e) {
								
								/* All subdomains shortcut. */
								
								hostname = url.split("/")[0]; 
								pathname = "/" + url.split("/").slice(1).join("/");
								
							}
							
							this.storage.getOrCreateDomain(
								domain => {
									
									resolve(domain.getOrCreateSite(pathname).upsertScript(script));
									
								}, hostname);
							
						}, reject
					);
			});
	};

	/* Validated "url" strings must come here. */
	this.updateParentFor = (script, url) => {
		
		try {
			
			let my_url = new URL ("http://" + url);
			
			if (script.parent && my_url.match(script.getUrl())) 
				return Promise.resolve(script);
			else
				return this.__updateParentFor(script, url);
			
		} catch (e) {
			
			if (e instanceof TypeError) {
				
				if (script.parent && script.parent.parent.isSubdomain())
					return script.getParentName() == url ? Promise.resolve(script) : this.__updateParentFor(script, url); 
				else 
					return this.__updateParentFor(script, url);
			}
		}
	};	
	
	this.haveInfoForUrl = (url) => {

		return new Promise (
			(resolve, reject) => {
				
				this.storage.getDomain(
					domain => {
						
						if (domain && domain.scripts.length)
							
							resolve(true);

						else {

							let sites = domain ? this.__getSitesInfoFor(domain, url.pathname) : { scripts: [], groups: [] };
							
							if (sites.scripts.length) {

								resolve(true);
								
							} else {			
								
								this.__getRepresentedBy(url.hostname)
									.then(
										subdomains => {
											
											let resolved = false;
											
											for (let subdomain of subdomains) {
												
												let endpoint = this.__getSitesInfoFor(subdomain, url.pathname);
												
												if (endpoint.scripts.length) {
													
													resolve(true);
													resolved = true;
													
													break;
													
												}
												
											}
											
											if (!resolved) {
											
												this.bg.group_mgr.getGroupScriptsForUrl(url)
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
}
