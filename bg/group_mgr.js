function GroupMgr (bg) {

	let self = this;

	Cache.call(this, {feeding: global_storage.getGroup, birth: global_storage.getOrCreateGroup, key: "groups"});
	
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
	
	this.__siteOps = function (group_name, url, func) {

		return new Promise (
			(resolve, reject) => {
				
				self.getOrBringCached(group_name)
					.then(
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

								/* !! */
								self.bg.domain_mgr.getOrCreateItem(hostname, false)
									.then(
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
											
										}
									);
							}
							
						});
			});
	};

	this.addSiteTo = function (group_name, url) {

		return self.__siteOps(group_name, url, "append");
		
	}

	this.removeSiteFrom = function (group_name, url) {
		
		return self.__siteOps(group_name, url, "remove");
		
	}
	
	this.clear = function () {

		for (let group of this.groups) {
			
			self.storage.removeGroup(group);
			
		}
	};
	
	this.importGroups = function (arr) {

		return new Promise(
			(resolve, reject) => {
				
				let promises = [];
				
				for (group_info of arr) {
					
					promises.push(self.updateCache(group_info));
					
				}
				
				Promise.all(promises)
					.then(
						merged_groups => {

							async.eachSeries(merged_groups,
								(group, next) => {
									
									async.eachSeries(group.sites,
										(site_name, next_site) => {
											
											let url = new URL("http://" + site_name);
											
											global_storage.getOrCreateDomain(
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
										
								}, err => {

									if (err)

										reject(err);

									else {
										
										self.bg.domain_mgr.reload();
										resolve();

									}
								})			
						})
			})
	};
	
	this.exportGroups = function (inline) {

		return new Promise(
			(resolve, reject) => {
				
				self.getAllItems().then(
					groups => {
				
						var text = ["["];
				
						for (group of groups) {
							
							text.push(group.getJSON());
							text.push(",");
						}

						if (groups.length)
							text.pop(); // last comma
						
						text.push("]");

						if (inline)
							resolve(text);
						else
							resolve(browser.downloads.download({ url: URL.createObjectURL( new File(text, "groups.json", {type: "application/json"}) ) }));
					}
				);
			});
	};
	
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
