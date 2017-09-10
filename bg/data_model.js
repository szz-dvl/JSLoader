/**
 * Fast UUID generator, RFC4122 version 4 compliant.
 * @author Jeff Ward (jcward.com).
 * @license MIT license
 * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
 **/
var UUID = (function() {
	var self = {};
	var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }

	self.generate = function() {
		var d0 = Math.random()*0xffffffff|0;
		var d1 = Math.random()*0xffffffff|0;
		var d2 = Math.random()*0xffffffff|0;
		var d3 = Math.random()*0xffffffff|0;
		return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
			lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
			lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
			lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
	}

	return self;
	
})();


// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
	
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;

	return this.push.apply(this, rest);

};

Array.prototype.insert = function(elem) {
	
	if (this.indexOf(elem) >= 0)
		return;
	else
		return this.push.apply(this, elem);
	
};

URL.prototype.match = function(url) {

	return (this.pathname == url.pathname && this.hostname == url.hostname);

};


function Script (opt) {
	
	var self = this;
	
	this.uuid = opt.uuid || UUID.generate();
	this.code = opt.code || "/* JS code (jQuery available) ...*/\n";
	this.parent = opt.parent || null;
	this.name = opt.name || this.uuid.split("-").pop(); /* To Do */
	
	// this.run = opt.code ? new Function(opt.code) : null;
	
	this.getUrl = function () {
		
		if (self.parent) {
			
			if (self.parent.isDomain())
				return new URL('http://' + self.parent.name);
			else 
				return new URL('http://' + self.parent.parent.name + self.parent.url);

		} else
			return null;
	};

	this.remove = function () {
		
		self.parent.removeScript(self.uuid);
		
	};

	/* !!! */
	this.updateParent = function (url) {

		console.log("update Prent Url: ");
		console.log(url);

		if (self.parent)
			self.remove();
		
		return new Promise (
			(resolve, reject) => {
	
				global_storage.getOrCreateDomain(
					domain => {
						
						resolve(domain.getOrCreateSite(url.pathname).upsertScript(self));

						console.error("Update Parent (" + url.hostname + "): ");
						console.error(self.parent);
						
						//self.persist().then(resolve, reject);
						
					}, url.hostname || url.href
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
	
	this.removeScript = function (id) {
		
		self.scripts.remove(
			self.scripts.findIndex(
				script => {
					
					return script.uuid = id;
					
				}
			)
		);

		if (self.isEmpty())  
			self.remove();
		
		self.parent.persist();
	};

	this.remove = function () {

		self.parent.removeSite(self.url);
		
	};

	this.persist = function () {

		return self.parent.persist();
		
	};
	
	this.isEmpty = function () {

		if (!self.isDomain())
			return !self.scripts.length;
		else 
			return !self.parent.scripts.length && !self.parent.sites.length;
	};

	
	this.upsertScript = function (script) {
		
		var idx = self.scripts.findIndex(
			exe => {
				return script.uuid == exe.uuid;
			}
		);

		if (idx >= 0)
			self.scripts[idx] = script;
		else { 	
			
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

	this.update = function () {

		return new Promise (
			(resolve, reject) => {
				
				global_storage.getDomain(
					
					domain => {
						
						self.scripts = domain.scripts.map (
							script => {

								script.parent = this;
								return new Script(script);
								
							}
						) || [];
						
						self.sites = domain.sites.map(
							site => {

								site.parent = this;
								return new Site(site);
								
							}
						) || [];

						resolve(self);
						
					}, self.name);
			}
		);
	};
	
	this.remove = function () {
	
		self.storage.__getDomains(arr => {
			
			var idx = arr.indexOf(self.name);
			
			if (idx >= 0) {
				
				arr.remove(idx);
				self.storage.__setDomains(arr);
				self.storage.__removeDomain(self.name);
			}
		});		
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

		if (pathname != "/") {

			self.remove();
			return;

		}
		
		self.sites.remove(
			self.sites.findIndex(
				site => {
					return site.url == pathname;
				}
			)
		);
		
		if (self.isEmpty())
			self.remove();
		
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
