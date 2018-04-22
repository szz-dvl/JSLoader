/* ALMOST DEPRECATED */
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
	this.code = opt.code || "/* JS code (jQuery, async and underscore available) ...*/\n";
	this.parent = opt.parent || null;
	this.name = opt.name || this.uuid.split("-").pop(); 
	this.disabled = opt.disabled || false;
	this.elems = [];
	
	this.getUrl = function () {
		
		if (self.parent && !self.parent.isGroup()) {
			
			if (self.parent.isSubdomain())
				return null;
			else
				return new URL('http://' + self.parent.parent.name + self.parent.url);
			
		} else
			return null; /* !!! */
	};

	this.remove = function () {

		if (self.elems.length)
			self.elems = [];

		/* Must always be present! */
		return self.parent 
			? self.parent.removeScript(self.uuid)
			: Promise.resolve();
	};
	
	this.findCache = function () {

		if (self.parent && self.parent.isGroup())
			return self.parent.cache;
		else
			return self.parent.parent.cache;
	};

	this.__schedulePersistAt = function (to) {

		if (self.persistTID)
			clearTimeout(self.persistTID);

		self.persistTID = setTimeout(
			() => {
				
				self.persist();
				
			}, to);
	}
	
	this.__updateParent = function (url) {

		return new Promise (
			(resolve, reject) => {
				
				self.remove()
					.then(
						() => {
							
							let cache = self.findCache();
							
							if (cache) {
								
								var pathname, hostname;
								
								try {
									
									let temp = new URL("http://" + url);
									
									pathname = temp.pathname;
									hostname = temp.hostname;
									
								} catch(e) {
									
									/* All subdomains shortcut. */
									
									hostname = url; 
									pathname = null;
									
								}
								
								cache.getOrCreateItem(hostname, false)
									.then(
										domain => {
											
											resolve(domain.getOrCreateSite(pathname).upsertScript(self));
											
										}, reject);
							} else 
								console.error("Attempting to upudate parent on uncached domain.");
							
						}, reject
					);
			}
		)
	};

	/* Validated "url" strings must come here. */
	this.updateParent = function (url) {

		try {
			
			let my_url = new URL ("http://" + url);
			
			if (self.parent && my_url.match(self.getUrl())) { 
				return Promise.resolve(self);
				
			} else
				return self.__updateParent(url);
			
		} catch (e) {

			if (e instanceof TypeError) {

				if (self.parent && self.parent.isSubdomain())
					return self.parent.name == url ? Promise.resolve(self) : self.__updateParent(url); 
				else 
					return self.__updateParent(url);
			}
		}
	};

	this.updateGroup = function (name) {
		
		if (self.parent.name != name) {
	
			return new Promise (
				(resolve, reject) => {
	
					self.remove()
						.then(
							() => {
								
								let cache = self.findCache();
								
								if (cache) { 
									
									cache.getOrCreateItem(name, false)
										.then(
											group => {
															
												resolve(group.upsertScript(self));
												
											}, reject
										);
									
								} else
									console.error("Attempting to upudate parent on uncached domain.");
								
							}, reject
						);
				}
			);
			
		} else
			return Promise.resolve(self);
	};

	/* ALMOST DEPRECATED */
	this.toggleDisable = function () {
		
		self.disabled = !self.disabled;

		self.__schedulePersistAt(500);
	}

	this.disabledAt = function (url_name) {
		
		if (self.parent.isGroup()) {

			return url_name ?
				   self.parent.isDisabled(self.uuid, url_name) :
				   self.parent.disabledEverywhere(self.uuid);
		} else
			return self.disabled;
	};

	this.toggleDisableFor = function (url_name) {

		if (self.parent.isGroup()) {

			if (url_name)
				self.parent.toggleDisableFor(self.uuid, url_name);
			else {
				
				if (self.parent.disabledEverywhere(self.uuid)) 
					self.parent.enableEverywhere(self.uuid);
				else
					self.parent.disableEverywhere(self.uuid);
			}
			
		} else {
			
			self.disabled = !self.disabled;
			
		}
		
		self.__schedulePersistAt(500);
	};
	
	this.persist = function () {

		if (!self.parent.haveScript(self.id))
			self.parent.upsertScript(self);
		
		return self.parent.persist();
		
	};

	this.getParentName = function () {

		return self.parent.isGroup() ? self.parent.name : self.parent.parent.name;
		
	};
	
	/* Views ALMOST DEPRECATED */
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

		//console.log("removeScript: " + (self.isEmpty() ? "removing " + self.name : "persisting " + self.name) );
		
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
			
			if (script instanceof Script)
				self.scripts.push(script);
			else
				self.scripts.push(new Script(script));
		}
		
		return script;	
	};

	this.haveData = function () {

		return self.scripts.length > 0;

	};
	
	this.haveScript = function (id) {

		return self.scripts.filter(
			script => {
				
				return script.uuid == id;
				
			}
		)[0] || false;
    };

	this.factory = function () {

		return new Script({parent: self});
	};
	
	/* Views: ALMOST DEPRECATED */
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
	
	this.isSubdomain = function () {
		
		return self.parent.name.startsWith("*."); /* All subdomains shortcut. */
		
	};
	
	this.isGroup = function() {
		
		return false;
		
	};

	this.siteName = function () {
		
		let name = self.parent.name + self.url;
		
		return name.slice(-1) == "/" ? name.slice(0, -1) : name;
		
	};
	
	this.isEmpty = function () {
		
		return !self.scripts.length && !self.groups.length; 
		
	};
	
	this.appendGroup = function (group) {
		
		if (!self.groups.includes(group.name))
			self.groups.push(group.name);
		
		if (!group.sites.includes(self.siteName()))
			group.sites.push(self.siteName());	
	};

	this.removeGroup = function (group) {
		
		self.groups.remove(self.groups.indexOf(group.name));
		group.sites.remove(group.sites.indexOf(self.siteName()));
		
		if (self.isEmpty())
			self.remove();
		
		if (group.isEmpty())
			group.remove();
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
		
		for (group_name of imported.groups) {
			
			if (!self.groups.includes(group_name))
				self.groups.push(group_name);
			
			/* The other half to be done from manager ¿¿?? */
			
		}
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
	
	Site.call(this, {url: "/", parent: this, scripts: opt.scripts, groups: opt.groups });

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
		
		return self.scripts.length ||
			self.sites.find(
				site => {

					return site.haveData();
					
				}
				
			) || false;
	};
	
	this.persist = function () {

		return new Promise (
			(resolve, reject) => {
				
				global_storage.upsertDomain(self.__getDBInfo())
					.then(
						() => {
							
							if (self.cache && self.haveData())
								self.cache.forceCacheItem(self); /* Caches must allways have persisted items. */
							
							resolve(self);
							
						}, reject
					);
			}
		);
	};
	
	this.remove = function () {
		
		return new Promise (
			(resolve, reject) => {
				
				global_storage.removeDomain(self.name)
					.then(
						() => {
										
							if (self.cache && self.cache.amICached(self.name))
								self.cache.removeCached(self.name);
										
							resolve();
										
						}, reject);
			}
		);				
	};	
	
	this.haveSites = function () {
		
		return self.sites.length > 0;
	};
	
	this.haveSite = function(pathname) {

		return (!pathname || pathname == "/")
			? self
			: self.sites.find(
				site => {	
					return site.url == pathname;
				}) || false;
	};
	
	this.getOrCreateSite = function (pathname) {
		
		if (!pathname || pathname == "/")
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

	/* Used by subdomains */
	this.ownerOf = function (domain_name) {

		if (self.isSubdomain()) {
			
			var mod_arr = domain_name.split(".");
			var orig_arr = self.name.split(".");
		
			var cursor_mod = mod_arr.length - 1;
			var cursor_orig = orig_arr.length - 1;
			
			while ( (orig_arr[cursor_orig] != "*") &&
					(mod_arr[cursor_mod] == orig_arr[cursor_orig])
				  ) {
			
				cursor_mod --;
				cursor_orig --;
				
				if (cursor_mod < 0)
					break;
			}
			
			return orig_arr[cursor_orig] == "*";

		} else
			return false;
	};
	
	this.mergeInfo = function (imported) {

		for (script of imported.scripts)
			self.upsertScript(script);

		for (site of imported.sites) 	
			self.getOrCreateSite(site.url).mergeInfo(site);
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

function Group (opt) {

	var self = this;

	__Script_Bucket.call(this, opt.scripts || []);
	
	this.name = opt.name || UUID.generate().split("-").pop();
	this.sites = opt.sites || [];
	this.disabledAt = opt.disabledAt || [];
	
	this.isDomain = function() {
		
		return false;
		
	};

	this.isSubdomain = function() {
		
		return false;
		
	};
	
	this.isGroup = function() {
		
		return true;	
	};

	this.isEmpty = function () {
		
		return !self.sites.length && !self.scripts.length; 
	};
	
	this.persist = function () {

		return new Promise(
			(resolve, reject) => {
				
				global_storage.upsertGroup(self.__getDBInfo())
					.then(
						() => {
							
							if (self.cache && self.haveData())
								self.cache.forceCacheItem(self);
							
							resolve(self);
							
						}, reject
					);
			}
		);
	};

	this.remove = function () {
		
		return new Promise (
			(resolve, reject) => {
				
				global_storage.removeGroup(self.name)
					.then(
						() => {

							if (self.cache && self.cache.amICached(self.name))
								self.cache.removeCached(self.name);
							
							resolve();
							
						}, reject);
			}
		);
	};

	this.appendSite = function (site) {
		
		if (!self.sites.includes(site.siteName()))
			self.sites.push(site.siteName());
		
		if (!site.groups.includes(self.name))
			site.groups.push(self.name);
	};

	this.removeSite = function (site) {
		
		self.sites.remove(self.sites.indexOf(site.siteName()));
		site.groups.remove(site.groups.indexOf(self.name));

		let idx = 0;
		
		for (let tuple of self.disabledAt) {

			if (tuple.url == site)
				self.disabledAt.remove(idx);

			idx ++;
		}
		
		if (self.isEmpty())
			self.remove();

		if (site.isEmpty())
			site.remove();
		
	};
	
	this.haveSite = function (site_name) {

		return self.sites.filter(
			site => {	
				return site == site_name;
			})[0] || false;
	};
	
	this.mergeInfo = function (imported) {

		for (let script of imported.scripts)
			self.upsertScript(script);
		
		for (let site_name of imported.sites) {
			
			if (!self.sites.includes(site_name))
				self.sites.push(site_name);
			
			/* 
			   The other half of the relation to be 
			   done from mgr! 
			   
			 */
		}

		for (let tuple of imported.disabledAt) {

			let script_mine = self.scripts.find(
				script => {
					return script.uuid == tuple.id;
				}
			) ? true : false;

			let site_mine = self.sites.find(
				site => {
					return site.siteName() == tuple.url;
				}
			) ? true : false;
			
			if (site_mine && script_mine) {
				
				let idx = self.disabledAt.findIndex(
					stored => {
						
						return stored.id == tuple.id && tuple.url == stored.url;	
					}
				);
				
				if (idx < 0)
					self.disabledAt.push({id: tuple.id, url: tuple.url});
			}
		}
	};

	/* Only for groups ! */
	this.isShown = function () {
		
		return self.elems.filter(
			elem => {
				return elem.shown;								
			}
		)[0] || false;
	};

	/* Cache compatibility */
	this.haveData = function () {
		
		return self.scripts.length || self.sites.length;
		
	};

	this.isDisabled = function (uuid, url_name) {
		
		return self.disabledAt.find(
			tuple => {
				return (tuple.id == uuid && tuple.url == url_name);
			}
		) ? true : false;
	}

	this.toggleDisableFor = function (uuid, url_name) {
		
		let idx = self.disabledAt.findIndex(
			tuple => {
				
				return tuple.id == uuid && tuple.url == url_name;
				
			}
		);
		
		if (idx >= 0)
			self.disabledAt.remove(idx);
		else
			self.disabledAt.push({id: uuid, url: url_name});
	}

	this.disabledEverywhere = function (uuid) {
		
		return self.sites.length && self.disabledAt.filter(
			tuple => {
				
				return tuple.id == uuid;
			}
			
		).length == self.sites.length;
	};
	
	this.disableEverywhere = function (uuid) {
		
		for (let site of self.sites) {
			
			let idx = self.disabledAt.findIndex(
				tuple => {
				
					return tuple.id == uuid && tuple.url == site;

				}
			
			);
		
			if (idx < 0)
				self.disabledAt.push({id: uuid, url: site});
		}
	}

	this.enableEverywhere = function (uuid) {
		
		for (let site of self.sites) {
			
			let idx = self.disabledAt.findIndex(
				tuple => {
				
					return tuple.id == uuid && tuple.url == site;

				}
			
			);
		
			if (idx >= 0)
				self.disabledAt.remove(idx);
		}
	}

	/* !!! ¿DEPRECATED? */
	this.ownerOf = function (site_name) {
		
		return self.sites.find(
			site => {
				
				if (site.startsWith("*."))
					return new Domain ({name: site}).ownerOf(site_name.split("/")[0]);
				else
					return site_name.startsWith(site);
			}
			
		) ? true : false;
	}
	
	this.isMySite = function (site_name) {
		
		return self.sites.find(
			site => {

				return site == site_name;
			}
			
		) ? true : false;
	}
	
	this.__getDBInfo = function () {
		
		return {
			
			name: self.name,
			sites: self.sites,
			disabledAt: self.disabledAt,
			scripts: self.scripts.map(
				script => {
					return script.__getDBInfo();
				}
			)
		}
	};
	
}

