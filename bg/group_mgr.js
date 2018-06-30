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
	
	this.getGroupScripts = (groups) => {

		return new Promise (
			(resolve, reject) => {

				let scripts = [];

				async.eachSeries(groups,
					(group_name, next) => {
						
						this.storage.getGroup(
							group => {
								
								if (group) {
									
									scripts.push.apply(scripts,
										group.scripts);
									
								} else 
									console.warn("Missing group: " + group_name);
								
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

	this.removeItem = (group_name) => {
		
		return new Promise(
			resolve => {
				this.storage.getGroup(
					group => {
						
						if (group) {
							
							group.remove()
								.then(
									removed => {
										
										async.each(removed.sites,
											(site_name, next_site) => {
												
												let hostname = site_name.split("/")[0];
												let pathname = "/" + site_name.split("/").slice(1).join("/");
												
												this.storage.getDomain(
													domain => {
														
														if (domain) {
															
															let site = domain.haveSite(pathname);
															
															if (site) 	
																site.removeGroup(removed);
															
															site.persist().then(() => { next_site() }, next_site);
															
														} else {

															console.warn("missing site: " + site_name);
															next_site();
														}
														
													}, hostname
												);
												
											}, err => {
												
												if (err)
													reject(err);
												else
													resolve(removed);
											}
										);
									}
								);
						
						} else
							reject(new Error("Attempting to remove unexisting group: \"" + group_name + "\""));
						
					}, group_name);
			});
	}
	
	this.__siteOps = (group_name, url, func) => {

		return new Promise (
			(resolve, reject) => {
				
				this.storage.getGroup(
					group => {
						
						if (! group)
							reject(new Error("Group " + group_name + " not existent, site: " + url + " not added."));
						else {
							
							var pathname, hostname;
							
							try {
								
								let temp = new URL("http://" + url);
								
								pathname = temp.pathname;
								hostname = temp.hostname;
								
							} catch(e) {
								
								hostname = url.split("/")[0]; 
								pathname = "/" + url.split("/").slice(1).join("/");
							}
							
							this.storage.getOrCreateDomain(
								domain => {
									
									let site = func == "append" ? domain.getOrCreateSite(pathname) : domain.haveSite(pathname);
									let pr = [];
									
									if (site) {
										
										group[func + "Site"](site);								
										
										if (!site.isEmpty()) 
											pr.push(site.persist());
										
										if (!group.isEmpty())
											pr.push(group.persist());
 									}
									
									Promise.all(pr).then(resolve, reject); /* Feedback when created ? */
									
								}, hostname
							);
						}
						
					}, group_name);
			});
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
				
				this.getMeaningful()
					.then(
						groups => {

							let filtered = groups.filter(group => { return group.includes(path); });
							
							resolve(
								{
									members:filtered.sort((a,b) => { return a.name > b.name; })
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
													actual: 0,
													total: group.scripts.length
												};
												
											}
										),

									actual: start,
									total: filtered.length
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
