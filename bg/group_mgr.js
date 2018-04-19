function GroupChooserWdw (wc) {

	return new Promise (
		(resolve, reject) => {
			
			browser.windows.create({
							
				type: "popup",
				state: "normal",
				url: browser.extension.getURL("fg/group/chooser.html"),
				width: Math.min(Math.max(900, (200 + (wc * 8))), screen.width),
				height: 120 
				
			}).then(
				wdw => {
					
					/* 
					   Workaround to avoid blank windows: 
					   
					   @https://discourse.mozilla.org/t/ff57-browser-windows-create-displays-blank-panel-detached-panel-popup/23644/3 
					   
					 */
					
					var updateInfo = {
						
						width: wdw.width,
						height: wdw.height + 1, // 1 pixel more than original size...
						
					};
					
					browser.windows.update (wdw.id, updateInfo)
						.then(resolve, reject);
					
				}, reject);	
		});
}

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
	
	this.showChooserWdw = function () {
		
		if (self.groups.length) {
			
			return new Promise (
				(resolve, reject) => {
					
					self.bg.tabs_mgr.getCurrentURL()
						.then(
							url => {
								
								self.adding = url;
								new GroupChooserWdw(url.name().length).then(resolve, reject);
								
							}
						);
				});
			
		} else {
			
			self.bg.notify_mgr.info("No groups available.");
			
		}
	};

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
											
											Promise.all(pr)
												.then(
													res => {
														
														/* Feedback when creted !!! */
														resolve(res);
														
													}
												);	
										});
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
		
		cosnsole.error("Unimplemented!");
	};

	/* !!! */
	this.importGroups = function (arr) {

		return new Promise(
			(resolve, reject) => {
				
				let promises = [];
				
				for (group_info of arr) {
					
					promises.push(self.updateCache(group_info));
					
				}

				/* 
				   At this point all data from imported JSON must be properly merged, 
				   need to check for unmet site relations. 
				   
				 */
				
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
							
							text.push.apply(text, JSON.stringify(group.__getDBInfo()).split('\n'));
							text.push(",");
						}
				
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
