function GroupMgr (bg) {

	DataMgr.call(this, { key: "Group" });
	
	this.bg = bg;
	
	this.groups = []; /* Index */
	this.storage = global_storage;
	this.adding;
	
	this.storage.__getGroups(
		new_groups => {
			
			if (new_groups)
				this.groups = new_groups;
		}
	);
	
	/* Expensive */
	this.getGroupsForUrl = (url) => {

		return new Promise (
			(resolve, reject) => {
				
				this.getMeaningful()
					.then(
						groups => {

							resolve(
								groups.filter(
									group => {
										return group.includes(url)
									})
							);
							
						}, reject);
			});
	}

	/* Expensive */
	this.getGroupScriptsForUrl = (url) => {

		return new Promise (
			(resolve, reject) => {

				this.getGroupsForUrl(url)
					.then(
						groups => {
							
							resolve(groups.reduce((val, nval) => { return val.concat(nval.scripts); }, []))
							
						}, reject);
			});
	}

	/* Expensive, @url: plain string here. */
	this.cleanSite = (site) => {

		return new Promise (
			(resolve, reject) => {
				
				this.getMeaningful()
					.then(
						groups => {
							
							async.each(groups,
								(group, next) => {
									
									group.cleanSite(site)
										.then(() => { next() }, () => { next(); });
									
								}, err => {

									console.log("Clean");
									
									if (err)
										reject(err);
									else
										resolve();
									
								}
							);
							
						}, reject);
			});
	}

	/* @url: plain string here. */
	this.__siteOps = (group_name, url, func) => {

		return new Promise(
			(resolve, reject) => {
			
				this.getItem(group_name)
					.then(
						group => {

							group[func + "Site"](url)
								.then(resolve, reject);
							
						}, reject
					)
			}
		);
	};

	this.addSiteTo = (group_name, url) => {
			
		return this.__siteOps(group_name, url, "append");
		
	}

	this.removeSiteFrom = (group_name, url) => {
		
		return this.__siteOps(group_name, url, "remove");
		
	}
	
	this.updateParentFor = (script, name) => {
		
		if (script.parent.name != name) {
	
			return new Promise (
				(resolve, reject) => {
					
					script.remove()
						.then(
							() => {

								this.storage.getOrCreateGroup(
									group => {
									
										resolve(group.upsertScript(script));
									
									}, name);
								
							}, reject
						);
				}
			);
			
		} else {
			
			return Promise.resolve(script);
		}
	}

	this.importData = (items) => {

		return new Promise(
			(resolve, reject) => {

				async.eachSeries(items,
					(item, next) => {
						
						this.storage.getOrCreateGroup(
							group => {

								group.mergeInfo(item);

								/* refac */
								async.eachSeries(group.sites,
									(site_name, next_site) => {
										
										let url = new URL("http://" + site_name);
										
										this.storage.getOrCreateDomain(
											domain => {
												
												let site = domain.haveSite(url.pathname);
												
												if (site) {
													
													site.appendGroup(group);
													site.persist().then(persisted => { next_site() }, next_site);
													
												} else {
													
													group.sites.remove(group.sites.indexOf(site_name));
													next_site();
												}
												
											}, url.hostname);

									}, err => {
										
										if (err)
											reject(err);
										else
											group.persist().then(persisted => { next() }, next);
									})
									
							}, item.name);

					}, err => {

						if (err)
							reject(err);
						else
							resolve();
					});
			});
	}

	this.getPASliceFor = (start, len, target, path, index) => {
		
		return new Promise(
			(resolve, reject) => {

				this.getGroupsForUrl(path)
					.then(
						groups => {
							
							resolve(
								{
									members: groups.sort((a,b) => { return a.name > b.name; })
										.slice(start, start + len)
										.map(
											group => {
												
												let first = this.__getFirstFor(target, group.name, index);
												
												return {
													
													name: group.name,
													scripts: group.scripts.sort(
														(a,b) => {
															
															return a.uuid > b.uuid;
															
														}).slice(first, first + 5),
													included: true,
													actual: 0,
													total: group.scripts.length
												};
												
											}
										),

									actual: start,
									total: groups.length
								}
							);
							
						}, reject);
			});
	}
	
	this.exportGroups = (inline) => {

		return new Promise(
			(resolve, reject) => {
				
				let text = ["["];
				
				async.each(this.groups,
					(group_name, next) => {
						
						this.storage.getGroup(
							group => {
								
								if (group) {

									text.push(group.getJSON());
									text.push(",");
									
								}

								next();
								
							}, group_name);
						
					}, err => {

						if (err) 
							reject (err); 
						else {
							
							if (text.length > 1)
								text.pop(); //last comma
							
							text.push("]");
							
							if (inline)
								resolve(text);
							else
								resolve(browser.downloads.download({ url: URL.createObjectURL( new File(text, "groups.json", {type: "application/json"}) ) }));
						}
						
					});
			});
	}
} 
