/* Represents an entity in a view. */
function Element (parent_id, shown, owner) {

	var self = this;

	this.parent_id = parent_id;
	this.owner = owner;
	this.view_state = shown;
	
	this.id = this.owner ? this.owner.uuid : null;
	this.shown = this.id ? this.view_state.includes(this.id) : false;
	this.state = this.shown ? "v" : ">";
	// this.available = this.owner ? this.owner.disabled ? "Enable" : "Disable" : "None";
	
	this.show = function () {

		self.shown = true;
		self.state = "v";

		if (self.id) {
			
			if (!self.view_state.includes(self.id))
				self.view_state.push(self.id);		
		}
	};

	this.hide = function () {

		self.shown = false;
		self.state = ">";

		if (self.id) {
			
			if (self.view_state.includes(self.id))
				self.view_state.remove(self.view_state.indexOf(self.id));
		}
	};

	this.toggle = function () {
		
		if (self.shown)
			self.hide();
		else
			self.show();
	};

	this.isShown = function () {

		return self.shown;
		
	};

	this.getEnabled = function () {

		if (self.owner)
			return self.owner.disabled ? "Enable" : "Disable";
		else
			return "None"; /* Must never be reached. */
	}
};

function Script (opt) {
	
	var self = this;
	
	this.uuid = opt.uuid || UUID.generate();
	this.code = opt.code || "/* JS code (jQuery available) ...*/\n" + this.uuid;
	this.parent = opt.parent || null;
	this.name = opt.name || this.uuid.split("-").pop(); 
	this.disabled = opt.disabled || false;
	this.elems = [];
	
	// this.run = opt.code ? new Function(opt.code) : null;
	
	this.getUrl = function () {
		
		if (self.parent && !self.parent.isGroup())
			return new URL('http://' + self.parent.parent.name + self.parent.url);
		else
			return null;
	};

	this.remove = function () {

		if (self.elems.length)
			self.elems = [];
		
		return self.parent ?
			self.parent.removeScript(self.uuid) :
			Promise.resolve();
	};
	
	this.badParent = function (url) {
		
		if (!url)
			return "Bad URL provided.";
		
		if (self.parent) {
			
			if (url.hostname != self.parent.parent.name) 	
				return "Changing target domain not allowed.";
		}
		
		return false;	
	};
	
	this.updateParent = function (url) {
		
		//console.log("New parent: " + url.href);

		var err = self.badParent(url);
		
		if (err)
			return Promise.reject({err: err});
		
		if (self.parent) {
			
			if (url.match(self.getUrl())) 
				return Promise.resolve(self);	
		
		}
		
		return new Promise (
			(resolve, reject) => {
				
				// console.error("Old Parent: ");
				// console.error(self.parent);
				
				self.remove()
					.then(
						() => {
							
							global_storage.getOrCreateDomain(
								
								domain => {
									
									resolve(domain.getOrCreateSite(url.pathname).upsertScript(self));
									
									// console.error("Update Parent (" + url.hostname + "): ");
									// console.error(self.parent);
						
								}, url.hostname || url.href
							);

						}, err => {

							// console.err("Update parent reject");
							// console.err(err);
							
							reject(err);
						}
					);
			}
		);
	};

	this.updateGroup = function (name) {

		console.log("update Group!, parent: " + self.parent.name + " new: " + name);
		
		if (self.parent.name != name) {
	
			return new Promise (
				(resolve, reject) => {
					
					self.remove()
						.then(
							() => {
								
								global_storage.getOrCreateGroup(
									
									group => {
										
										resolve(group.upsertScript(self));
										
									}, name
								);

							}, reject
						);
				}
			);

		} else
			return Promise.resolve(self);
	};
	
	this.toggleDisable = function () {
		
		self.disabled = !self.disabled;

		if (self.persistTID)
			clearTimeout(self.persistTID);

		self.persistTID = setTimeout(
			() => {

				self.persist();
			
			}, 1000); 
	}
	
	this.setParent = function (url) {
		
		if (self.parent)
			return Promise.resolve(self);
		else
			return self.updateParent(url);
	};
	
	this.persist = function () {
	
		return self.parent.persist();
		
	};

	this.getParentName = function () {

		return self.isGroup() ? self.parent.name : self.parent.parent.name;

	}

	/* Views */
	this.elemFor = function (list_uuid) {

		return self.elems.filter(
			elem => {
				return elem.parent_id == list_uuid;
			}
		)[0] || null;
	};

	this.insertElem = function (parent_id, page_shown) {
		
		var exists = self.elems.filter(
			stored => {
				return stored.parent_id == parent_id;
			}
		)[0];

		if (exists)
			return exists;
		else {

			var elem = new Element(parent_id, page_shown, self);
			self.elems.push(elem);

			return elem;
		}
	};
	
	/* Stringify */
	this.__getDBInfo = function () {

		return {
			
			uuid: self.uuid,
			code: self.code,
			name: self.name,
			disabled: self.disabled
		}
	};
}

function __Script_Bucket (scripts) {

	var self = this;

	this.elems = [];
	this.scripts = [];
	
	if (scripts) {
		
		for (script of scripts) {
			
			script.parent = this;
			this.scripts.push(new Script(script));
		}
	} 
	
	this.removeScript = function (id) {
		
		self.scripts.remove(
			self.scripts.findIndex(
				script => {
					
					return script.uuid == id;
				}
			)
		);
		
		return self.isEmpty() ?
			self.remove() :
			self.persist();
	}
	
	this.upsertScript = function (script) {
		
		var idx = self.scripts.findIndex(
			exe => {
				return script.uuid == exe.uuid;
			}
		);
		
		if (idx >= 0) {
			
			self.scripts[idx].name = script.name;
			self.scripts[idx].code = script.code;
			self.scripts[idx].disabled = script.disabled;
			
		} else { 	
			
			script.parent = self;
			self.scripts.push(script);
			
		}
		
		return script;	
	};
	
	// this.haveScripts = function () {
		
	// 	return self.scripts.length > 0;
		
	// };
	
	this.haveScript = function (id) {

		return self.scripts.filter(
			script => {
				
				return script.uuid == id;
				
			}
		)[0] || false;
    };

	/* Views */
	this.elemFor = function (list_uuid) {
		
		return self.elems.filter(
			elem => {
				return elem.parent_id == list_uuid;
			}
		)[0] || null;
	};
	
	this.insertElem = function (parent_id, page_shown) {
		
		var exists = self.elems.filter(
			stored => {
				return stored.parent_id == parent_id;
			}
		)[0];
		
		if (!exists)
			self.elems.push(new Element(parent_id, page_shown));
	};

	this.shownFor = function (list_uuid) {
		
		return self.elemFor(list_uuid).shown; 
		
	};
	
}

function Site (opt) {
	
	var self = this;
	
	this.url = opt.url || null;
	this.parent = opt.parent || null;
	
	__Script_Bucket.call(this, opt.scripts || []);
	
	this.groups = opt.groups || [];
	
	this.isDomain = function() {
		
		return self.url == "/";
		
	};
	
	this.isGroup = function() {
		
		return false;
		
	};

	this.siteName = function () {
		
		return self.parent.name + self.url;
		
	};
	
	this.isEmpty = function () {
		
		return !self.scripts.length && !self.groups.length; 
		
	};

	this.appendGroup = function (group) {
		
		if (!self.groups.includes(group.name))
			self.groups.push(group.name);

		if (group.sites.includes(self.siteName()))
			group.sites.push(self.siteName());
		
	};

	this.removeGroup = function (group) {
		
		self.groups.remove(self.groups.indexOf(group.name));
		group.sites.remove(group.sites.indexOf(self.siteName()));
		
	};
	
	this.remove = function () {
		
		if (self.elems.length)
			self.elems = [];
		
		return self.parent.removeSite(self.url);	
	};

	this.persist = function () {
	
		return self.parent.persist();
		
	};

	this.mergeInfo = function (imported) {

		for (script of imported.scripts)
			self.upsertScript(script);

		for (group_name of imported.groups)
			self.upsertScript(script);
	}

	/* Stringify */
	this.__getDBInfo = function () {
		
		return {
			url: self.url,
			groups: self.groups,
			scripts: self.scripts.map(
				script => {
					return script.__getDBInfo();
				}
			)
		}
	};
}

function Domain (opt) {

	var self = this;
	
	if (!opt || !opt.name)
		return null;
	
	Site.call(this, {url: "/", parent: this, scripts: opt.scripts});

	this.name = opt.name;
	
	this.sites = [];
	if (opt.sites) {

		for (site of opt.sites) {

			site.parent = this;
			this.sites.push(new Site(site));
		}

	}
	
	this.isEmpty = function () {

		return !self.scripts.length && !self.sites.length && !self.groups.length;
		
	};

	this.haveData = function () {

		return self.scripts.length || self.sites.length;
		
	};
	
	this.persist = function () {

		return new Promise (
			(resolve, reject) => {
				
				global_storage.__getDomains(
					arr => {
						
						if (!arr.includes(self.name)) {
					
							arr.push(self.name);
							global_storage.__setDomains(arr);
						}
						
						global_storage.__upsertDomain(self.name, self.__getDBInfo())
							.then(
								() => {
									
									resolve(self);
								},
								err => {
									
									console.error(err);
									reject(err);
									
								}
							);
					}
				);
			}
		);
	};
	
	this.remove = function () {
		
		return new Promise (
			(resolve, reject) => {
			
				global_storage.__getDomains(
					arr => {
						
						var idx = arr.indexOf(self.name);
			
						if (idx >= 0) {
							
							arr.remove(idx);
							global_storage.__setDomains(arr);
							global_storage.__removeDomain(self.name)
								.then(resolve, reject);
						} else
							resolve();
					}
				);
			}
		);				
	};
	
	this.haveSites = function () {
		
		return self.sites.length > 0;

	};
	
	this.haveSite = function(pathname) {

		return self.sites.filter(
			site => {	
				return site.url == pathname;
			})[0] || false;
	};

	this.getOrCreateSite = function (pathname) {
		
		if (pathname == "/" || !pathname)
			return self;
		
		var site = self.haveSite(pathname);
		var n;
		
		if (site)
			return site;
		
		n = new Site ({url: pathname, parent: self});	
		self.sites.push(n);
	
		return n;
	};
	
	this.haveScript = function (id) {
		
		return self.scripts.filter(
			script => {
				
				return script.uuid == id;
				
			}
		)[0] ||
			self.sites.map(
				site => {
					
					return site.haveScript(id);
					
				}).filter(
					script => {
						
						return script;
						
					}
				)[0] ||
			false;
	};
	
	this.removeSite = function (pathname) {
		
		if (pathname == "/")
			return self.remove();
		
		self.sites.remove(
			self.sites.findIndex(
				site => {
					return site.url == pathname;
				}
			)
		);
		
		/* to Log */
		return self.isEmpty() ?
			self.remove() :
			self.persist();		
	};

	this.mergeInfo = function (imported) {

		for (script of imported.scripts)
			self.upsertScript(script);

		for (site of imported.sites) 	
			self.getOrCreateSite(site.url).appendGroup(self.name);
		
	};
	
	this.__getDBInfo = function () {
		
		return {
			
			name: self.name,
			groups: self.groups,
			
			sites: self.sites.map(
				site => {
					return site.__getDBInfo();
				}
			),
			
			scripts: self.scripts.map(
				script => {
					return script.__getDBInfo();
				}
			)
		}
	};
	
}

function AllSubDomainsFor (opt) {

	var self = this;
	
	this.name = opt.name || null;
	this.groups = opt.groups || [];
	
	this.persist = function () {

		return new Promise (
			(resolve, reject) => {
				
				global_storage.upsertSubDomain(self.name.slice(2), self.__getDBInfo())
					.then(
						() => {
							
							resolve(self);
							
						}, reject);
			}
		);
	};
	
	this.remove = function () {
		
		return new Promise (
			(resolve, reject) => {
				
				global_storage.removeSubDomain(self.name.slice(2));
				
			}
		);				
	};

	this.appendGroup = function (group) {

		if (!self.groups.includes(group.name))
			self.groups.push(group.name);

		if (!group.sites.includes(self.name))
			group.sites.push(self.name);
		
	};

	this.removeGroup = function (group) {
		
		self.groups.remove(self.groups.indexOf(group.name));
		group.sites.remove(group.sites.indexOf(self.name));
	};
	
	this.__getDBInfo = function () {
		
		return {
			
			name: self.name,
			groups: self.groups	
		}
	};
}

function Group (opt) {

	var self = this;

	__Script_Bucket.call(this, opt.scripts || []);
	
	this.name = opt.name || UUID.generate().split("-").pop();
	this.sites = opt.sites || [];
	
	this.isDomain = function() {
		
		return false;
	};
	
	this.isGroup = function() {
		
		return true;	
	};

	this.isEmpty = function () {
		
		return !self.sites.length && !self.scripts.length; 
	};
	
	this.persist = function () {
		
		global_storage.getGroups(
			groups => {
				
				if (!groups.includes(self.name)) {

					groups.push(self.name);
					global_storage.setGroups(groups);
					
				}

			}
		);
		
		return global_storage.upsertGroup(self.__getDBInfo()); 
	};

	this.remove = function () {

		global_storage.getGroups(
			groups => {

				if (groups.includes(self.name)) {
					
					groups.remove(groups.indexOf(self.name));
					global_storage.setGroups(groups);	
				}
			}
		);
		
		return global_storage.removeGroup(self.name);
	};

	this.appendSite = function (site) {

		if (!self.sites.includes(site.name))
			self.sites.push(site.name);

		if (!site.groups.includes(self.name))
			site.groups.push(self.name);
		
	};

	this.removeSite = function (site) {

		console.log("Removing: ");
		console.log(site);
		
		self.sites.remove(self.sites.indexOf(site.name));
		site.groups.remove(site.groups.indexOf(self.name));
		
	};

	this.haveSite = function (site_name) {

		return self.sites.filter(
			site => {	
				return site == site_name;
			})[0] || false;
	};
	
	this.mergeInfo = function (imported) {

		for (script of imported.scripts)
			self.upsertScript(script);

		for (site_name of imported.sites) 	
			self.appendSite(site_name);	
	};
	
	this.__getDBInfo = function () {
		
		return {
			
			name: self.name,
			sites: self.sites,
			scripts: self.scripts.map(
				script => {
					return script.__getDBInfo();
				}
			)
		}
	};
	
}

