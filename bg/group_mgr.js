function GroupChooserWdw () {

	return new Promise (
		(resolve, reject) => {
			
			browser.windows.create({
							
				type: "popup",
				state: "normal",
				url: browser.extension.getURL("fg/group/chooser.html"),
				width: 900,
				height: 120 
				
			}).then(resolve,reject);
			
		});
}

function GroupMgr (bg) {

	var self = this;

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
	
	// this.getOrCreateGroup = function (name) {

	// 	return new Promise (
	// 		(resolve, reject) => {
				
	// 			if (name) {

	// 				/* cache !! */
	// 				self.getOrCreateItem(name, false)
	// 					.then(group => {
							
	// 						resolve(group);
							
	// 					});
					
	// 			} else
	// 				resolve(new Group({}));
	// 		}
	// 	)
	// };
	
	this.showChooserWdw = function () {
		
		if (self.groups.length) {
			
			return new Promise (
				(resolve, reject) => {
					
					self.bg.tab_mgr.getCurrentUrl()
						.then(
							url => {
								
								self.adding = url;
								new GroupChooserWdw().then(resolve, reject);
						
							}
						);
				});
		} else
			self.bg.notifyUser("JSL", "No groups available.");
	}
	
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

									hostname = temp.hostname;
									pathname = null;
								}

								/* !! */
								self.bg.domain_mgr.getOrCreateItem(temp.hostname, false)
									.then(
										domain => {
											
											let site = func == "append" ? domain.getOrCreateSite(temp.pathname) : domain.haveSite(temp.pathname);
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

	this.getFullGroups = function (done) {
		
		var missing = _.difference(self.groups, self.getCachedNames());
		
		async.each(missing,
				   (group_name, cb) => {
					   
					   self.getAndCacheItem(group_name)
						   .then(
							   group => {
								   
								   cb();
									 
							   }
						   );
				   },
				   () => {
					   
					   done(self.cache);
					   
				   });
	};

	this.clear = function () {

		self.getFullGroups(
			groups => {

				for (group of groups)
					group.remove();
				
			})
	};
	
	this.importGroups = function (arr) {
		
		for (group_info of arr)
			self.updateCache(new Domain (group_info));
			
	};
	
	this.storeNewGroups = function (changes, area) {
		
		if (area != "local")
	 		return;
		
		for (key of Object.keys(changes)) {
			
			if (key == "groups") 	
				self.groups = changes.groups.newValue || [];

			// else if (key.includes("group-")){  /* Regex to match start*/

			// 	/* group removed */
			// 	if (!changes[key].newValue)
			// 		self.removeCached(changes[key].oldValue.name);
			// }
		}
	};
	
	browser.storage.onChanged.addListener(this.storeNewGroups);

} 
