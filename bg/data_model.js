function Script (opt) {
	
	var self = this;
	
	this.uuid = opt.uuid || UUID.generate();
	this.code = opt.code || "/* JS code (jQuery available) ...*/\n" + this.uuid;
	this.parent = opt.parent || null;
	this.name = opt.name || this.uuid.split("-").pop(); /* To Do */
	
	// this.run = opt.code ? new Function(opt.code) : null;
	
	this.getUrl = function () {
		
		if (self.parent)
			return new URL('http://' + self.parent.parent.name + self.parent.url);
		else
			return null;
	};

	this.remove = function () {
		
		return self.parent ?
			self.parent.removeScript(self.uuid) :
			Promise.resolve();
		
	};

	this.updateParent = function (url) {

		console.log("New parent: " + url.href);
		
		if (!url)
			return Promise.reject({err: "Bad URL provided."});
		
		if (self.parent) {

			if (url.hostname != self.parent.parent.name) {
			
				return Promise.reject({err: "Changing target domain not allowed."});

			} else if (url.match(self.getUrl())) {

				return Promise.resolve(self);
				
			}
		}
		
		/* !!! After promise ?? */
		return new Promise (
			(resolve, reject) => {
				
				console.error("Old Parent: ");
				console.error(self.parent);
				
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

							console.err("Update parent reject");
							console.err(err);
							
							reject(err);
						}
					);
			}
		);
	};
	
	this.setParent = function (url) {
		
		if (self.parent)
			return Promise.resolve(self);
		else
			return self.updateParent(url);
	};
	
	this.persist = function () {
	
		return self.parent.persist();
		
	};

	/* Stringify */
	this.__getDBInfo = function () {

		return {
			
			uuid: self.uuid,
			code: self.code,
			name: self.name
		}
	};
}

function Site (opt) {

	var self = this;

	this.url = opt.url || null;
	this.parent = opt.parent || null;
	
	this.scripts = [];
	if (opt.scripts) {

		for (script of opt.scripts) {

			script.parent = this;
			this.scripts.push(new Script(script));
		}

	} 
	
	this.isDomain = function() {

		return self.url == "/";
		
	};
	
	this.remove = function () {

		return self.parent.removeSite(self.url);
		
	};

	this.persist = function () {
	
		return self.parent.persist();
		
	};
	
	this.isEmpty = function () {
		
		return !self.scripts.length;
	};

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

			console.log ("Udating script: " + idx);
			self.scripts[idx].name = script.name;
			self.scripts[idx].code = script.code;

		} else { 	
			
			script.parent = self;
			self.scripts.push(script);
			
		}
		
		return script;
		
	};
	
	this.haveScripts = function () {
		
		return self.scripts.length > 0;
		
	};
	
	this.haveScript = function (id) {

		return self.scripts.filter(
			script => {
				
				return script.uuid == id;
				
			}
		)[0] || false;
    };
	
	this.__getDBInfo = function () {
		
		return {
			url: self.url,
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
	
	this.storage = global_storage;
	
	this.isEmpty = function () {
		
		return !self.scripts.length && !self.sites.length;
		
	};
	
	this.persist = function () {

		return new Promise (
			(resolve, reject) => {
				
				self.storage.__getDomains(
					arr => {

						if (!arr.includes(self.name)) {
					
							arr.push(self.name);
							self.storage.__setDomains(arr);
						}
						
						self.storage.__upsertDomain(self.name, self.__getDBInfo())
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
			
				self.storage.__getDomains(
					arr => {
						
						var idx = arr.indexOf(self.name);
			
						if (idx >= 0) {
					
							arr.remove(idx);
							self.storage.__setDomains(arr);
							self.storage.__removeDomain(self.name)
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

		if (pathname == "/")
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
		
		return self.isEmpty() ?
			self.remove() :
			self.persist();		
	};

	this.__getDBInfo = function () {
		
		return {
			
			name: self.name,
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
