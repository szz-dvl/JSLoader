function GroupMgr (bg) {

	let self = this;

	DataMgr.call(this, { key: "Group" });
	
	this.bg = bg;
	
	this.groups = []; /* Index */
	this.storage = global_storage;
	this.adding;
	
	this.storage.__getGroups(
		new_groups => {
			
			if (new_groups)
				self.groups = new_groups;
		}
	);

	this.exists = function (group_name) {

		return self.groups.find(
			gname => {

				return gname == group_name;
			}
			
		) || false;

	};

	this.getGroupScripts = function (groups) {

		return new Promise (
			(resolve, reject) => {

				let scripts = [];

				async.eachSeries(groups,
					(group_name, next) => {
						
						self.storage.getGroup(
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
	
	this.__siteOps = function (group_name, url, func) {

		return new Promise (
			(resolve, reject) => {
				
				self.storage.getGroup(
					group => {
						
						if (! group)
							console.error("Group " + group_name + " not existent, site: " + url + " not added.");
						else {
							
							var pathname, hostname;
							
							try {
								
								let temp = new URL("http://" + url);
								
								pathname = temp.pathname;
								hostname = temp.hostname;
								
							} catch(e) {
								
								hostname = url;
								pathname = null;
							}
							

							self.storage.getOrCreateDomain(
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
									
									Promise.all(pr).then(resolve); /* Feedback when created !!! */
									
								}, hostname
							);
						}
						
					}, group_name);
			});
	};

	this.addSiteTo = function (group_name, url) {

		return self.__siteOps(group_name, url, "append");
		
	}

	this.removeSiteFrom = function (group_name, url) {
		
		return self.__siteOps(group_name, url, "remove");
		
	}
	
	/* this.clear = function () {

	   for (let group of this.groups) {
	   
	   self.storage.removeGroup(group);
	   
	   }
	   }; */

	this.updateParentFor = function (script, name) {
		
		if (script.parent.name != name) {
	
			return new Promise (
				(resolve, reject) => {
					
					script.remove()
						.then(
							() => {

								self.storage.getOrCreateGroup(
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

	this.importData = function (items) {

		return new Promise(
			(resolve, reject) => {

				async.eachSeries(items,
					(item, next) => {
						
						self.storage.getOrCreateGroup(
							group => {

								group.mergeInfo(item);

								async.eachSeries(group.sites,
									(site_name, next_site) => {
										
										let url = new URL("http://" + site_name);
										
										self.storage.getOrCreateDomain(
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
	
	this.exportGroups = function (inline) {

		return new Promise(
			(resolve, reject) => {
				
				let text = ["["];
				
				async.each(self.groups,
					(group_name, next) => {
						
						self.storage.getGroup(
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
		
	this.storeNewGroups = function (changes, area) {
		
		if (area != "local")
	 		return;
		
		for (key of Object.keys(changes)) {
			
			if (key == "groups") 	
				self.groups = changes.groups.newValue || [];
		}
	};
	
	browser.storage.onChanged.addListener(this.storeNewGroups);

} 
