
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

URL.prototype.match = function(url) {

	return this.pathname == url.pathname && this.hostname == url.hostname;

};


function Script (opt) {

	var self = this;
	
	this.uuid = opt.uuid || UUID.generate();
	this.code = opt.code || "/* JS code (jQuery available) ...*/\n";
	this.parent = opt.parent || null;
	this.name = opt.name || this.uuid.split("-").pop(); /* To Do */

	this.run = opt.code ? new Function(opt.code) : null;
	
	this.getUrl = function () {

		if (self.parent.isDomain())
			return self.parent.name;
		else 
			return self.parent.parent.name + self.parent.url;
		
	};

	this.remove = function () {
		
		self.parent.removeScript(self.uuid);
		
	};

	/* ¿¿?? */
	this.updateCode = function (literal) {

		self.code = literal;
		self.run = new Function(self.code);
	}
	
	this.persist = function () {

		self.parent.persist();
		
	}
}

function Site (opt) {

	var self = this;

	this.url = opt.url || null;
	this.parent = opt.parent || null;
	
	this.scripts = [];
	if (opt.scripts) {

		for (script of opt.scripts ) {

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

		if (self.isEmpty()) { 

			self.remove();
			self.parent.persist();
					
		}
			
	};

	this.findScript = function (id) {

		return self.scripts.filter(
			script => {
				
				return script.uuid = id;
				
			}
		)[0];
    };

	this.remove = function () {

		self.parent.removeSite(self.url);
		
	};

	this.persist = function () {

		self.parent.persist();
		
	};
	
	this.isEmpty = function () {

		if (!self.isDomain())
			return !self.scripts.length;
		else 
			return !self.parent.scripts.length && !self.parent.sites.length;
	};


	this.createScript = function () {

		return new Script({parent: self});
		
	}
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
		
		self.storage.__upsertDomain(self.name, self);
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
	
	this.haveScripts = function () {
		
		return self.scripts.length > 0;

	};

	this.haveSites = function () {
		
		return self.sites.length > 0;

	};
	
	this.haveSite = function(url) {
		
		for (site of self.sites) {
				
			if (site.url == url)
				return site;
			
		}
		
		return null;
	};

	this.getOrCreateSite = function (url) {

		if (url == "/")
			return self;
		
		var site = self.haveSite(url);
		var n;
		
		if (site)
			return site;
		
		n = new Site ({url: url, parent: self});
		
		self.sites.push(n);
		
		return n;
	};
	
	this.getOrCreateScript = function (code, uuid) {

		
		var script;
		var literal = code ? unescape(code.toString()) : "";

		if (uuid) {
			script = self.findScript(uuid);

			/* Must never happen */
			if (!script) { 	

				script = new Script({ code: literal, uuid: uuid } );
				self.scripts.push(script);

			}
			
		} else {
			
			script = new Script({ code: literal } );
			self.scripts.push(script);
		}
		
		return script;
		
	};
	
	this.findScript = function (id) {

		for (script of self.scripts) {
			if (script.uuid == id)
				return script;
		}

		for (site of self.sites) {

			var script = site.findScript(id);

			if (script)
				return script;
		}

		return null;
	};

	this.removeSite = function (url) {
		
		if (url != "/") {
			
			var i = 0;
			for (site of self.sites) {
				
				if (site.url == url) {
					
					self.sites.remove(i);
					
					if (self.isEmpty())
						self.remove();
					
					return;
				}
			}
			
		} else {
			self.remove();
		}
	};

	// console.log("Done creating Domain: " + opt.name);
	// console.log(self);
	
}
