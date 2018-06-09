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
		
		/* source: https://stackoverflow.com/questions/4460586/javascript-regular-expression-to-check-for-ip-addresses */
		
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
	
	this.__getRepresentedBy = (hostname) => {
		
		return new Promise (
			(resolve, reject) => {
				
				let domains = [];
				let names = [];
				
				var split = this.__isIPAddr(hostname) ? [] : hostname.split(".");
				let aux = split.slice(1);
				
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
		
		let res = { scripts: [], groups: domain.groups };
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
					
					if (site.groups.length)
						res.groups.push.apply(res.groups, site.groups);
				}

				path += "/";
				
			}
		}
		
		return res;
	};
	
	this.__getAggregatedScripts = (groups, hostname, pathname) => {
		
		return new Promise (
			(resolve, reject) => {
				
				let scripts = [];
				
				this.__getRepresentedBy(hostname)
					.then(
						subdomains => {
							
							for (let subdomain of subdomains) {
								
								let info = this.__getSitesInfoFor(subdomain, pathname);			
								
								scripts.push.apply(scripts,
									info.scripts.reduce((val, nval) => { return val.concat(nval.scripts); }, []));
								
								groups.push.apply(groups,
									info.groups);
							}
							
							this.bg.group_mgr.getGroupScripts(groups)
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
								
								groups.push.apply(groups,
									sites.groups);	
							}
							
							/* Group & Subdomain scripts */
							this.__getAggregatedScripts(groups.unique(), url.hostname, url.pathname)
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
						
						let site = null;
						let sites = [];
						let groups = [];
						let editInfo = {
							
							site: [], 
							subdomains: [],
							groups: [],
							disabled: self.__isDisabled(url.hostname),
							exists: false
							
						};		
						
						if (domain) {
							
							editInfo.exists = true;
							
							let info = this.__getSitesInfoFor(domain, url.pathname);
							
							editInfo.site.push.apply(editInfo.site,
								info.scripts);
							
							groups.push.apply(groups,
								info.groups); 
							
						}
						
						this.__getRepresentedBy(url.hostname)
							.then(
								subdomains => {
									
									for (let subdomain of subdomains) {

										let info = this.__getSitesInfoFor(subdomain, url.pathname);
										
										editInfo.subdomains.push({

											name: subdomain.name,
											sites: info.scripts

										});
											
										groups.push.apply(groups,
											info.groups);	
									}
									
									groups = groups.unique();
									
									this.bg.group_mgr.getGroupScripts(groups).then(
										group_scripts => {
											
											for (let group of groups) {
												
												let filtered = group_scripts
													.filter(
														script => {
															return group == script.parent.name;
														}
													);
												
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
	
	this.importData = (items) => {
		
		return new Promise(
			(resolve, reject) => {
				
				async.eachSeries(items,
					(item, next) => {
						
						this.storage.getOrCreateDomain(
							domain => {
								
								domain.mergeInfo(item);								

								/* !!! */
								for (let group_name of domain.groups) {
									
									this.storage.getGroup(
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
										
										this.storage.getGroup(
											group => {
												
												if (group) {
													
													group.appendSite(site);
													group.persist();
													
												} else 
												   site.groups.remove(site.groups.indexOf(group_name));
												
												
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
	
	this.__updateParentFor = (script, url) => {
		
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
						
						let groups = [];
						
						if (domain && domain.scripts.length)
							
							resolve(true);

						else {

							let sites = domain ? this.__getSitesInfoFor(domain, url.pathname) : { scripts: [], groups: [] };
							
							if (sites.scripts.length) {

								resolve(true);
								
							} else {
								
								if (domain) {
									
									groups.push.apply(groups,
										sites.groups);	
								}									
								
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
												
												groups.push.apply(groups,
													endpoint.groups);
											}
											
											if (!resolved) {
											
												this.bg.group_mgr.getGroupScripts(groups.unique())
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
