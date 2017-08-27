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

function Storage () {

	/* To do cacth error */
	
	this.__get = function (cb, key) {
		
		var gettingSites = browser.storage.local.get(key);
		
		gettingSites.then((values) => {
			cb(values);
		});
		
	};

	this.__set = function (key, val) {
		
		browser.storage.local.set(key, val);
	};

	this.__remove = function (key) {
		
		browser.storage.local.remove(key);
	};

	this.__getDomains = function (cb) {
		
		this.__get(cb, 'domains');

	};

	this.__setDomains = function (val) {
		
		this.__set('domains', val);
	};

	this.__upsertDomain = function (name, val) {
		
		this.__set('domain-' + name, val);
	};

	this.__getDomain = function (cb, name) {
		
		this.__get(cb, 'domain-' + name);
	};

	this.__removeDomain = function (name) {
		
		this.__remove('domain-' + name);
	};

}

var global_storage = new Storage();

function DomainStorage (domain) {

	this.domain = domain || null;
	this.storage = global_storage;
	
	this.persist = function () {

		if (!this.domain.idx) {
			
			this.storage.__getDomains(function(arr) {
				
				this.domain.idx = arr.length;
				arr.push(this.domain.name);

				this.storage.__setDomains(arr);
			});
			
		}
		
		this.storage.__upsertDomain(this.domain.name, this.domain.__getDBInfo());
	};

	
	this.remove = function () {


		if (this.domain.idx) {
			
			this.storage.__getDomains(function(arr) {
				
				arr.remove(this.domain.idx);
				
			});

			this.storage.__removeDomain(this.domain.name);
		}
	};
}

function Script (opt) {

	var self = this;
	
	this.id = opt.id || UUID.generate();
	this.id = opt.code || null;
	
	/* this.run = function () {

	   (new Function(this.code)());
	   
	   } */
	
	this.__getDBInfo = function () {

		return {
			
			id: self.id,
			code: self.code
		}
	}
}

function Site (opt) {

	this.url = opt.url || null;

	if (opt.scripts) {

		for (var i = 0; i < opt.scripts.length; i++ ) {

			this.scripts.push(new Script(opt.scripts[i]));
		}

	} else {
		
		this.scripts = null;
	}
	
	this.addScript = function (script) {

		this.scripts.push(script);

	};

	this.removeScript = function (script) {
		
		for (var i = 0; i < this.scripts.length; i++) {
			
			if (this.scripts[i].id == script.id) {

				this.scripts.remove(i);
				break;
			}	
		}
	};

	this.__getDBInfo = function () {

		var scripts = [];
		
		for (var i = 0; i < this.scripts.length; i++ ) 
			scripts.push(this.scripts[i].__getDBInfo());
		
		return {
			
			url: this.url,
			scripts: scripts
		}
	}
}

function Domain (opt) {
	
	this.name = opt.name;

	if (!this.name)
		return;
	
	this.storage = new DomainStorage(this);

	if (opt.scripts) {

		for (var i = 0; i < opt.scripts.length; i++ ) {

			this.scripts.push(new Script(opt.scripts[i]));
		}

	} else {
		
		this.scripts = null;
	}

	if (opt.sites) {

		for (var i = 0; i < opt.sites.length; i++ ) {

			this.sites.push(new Site(opt.sites[i]));
		}

	} else {
		
		this.sites = null;
	}
	
	this.idx = opt.idx || null;
	
	this.getSites = function() {

		return this.sites;

	};

	this.addSite = function (site) {

		this.sites.push(site);

	};

	this.removeSite = function (site) {
		
		for (var i = 0; i < this.sites.length; i++) {
			
			if (this.sites[i].id == site.id) {

				this.sites.remove(i);
				break;
			}	
		}

	};
	
	this.addScript = function (script) {

		this.scripts.push(script);

	};

	this.removeScript = function (script) {
		
		for (var i = 0; i < this.scripts.length; i++) {
			
			if (this.scripts[i].id == script.id) {

				this.scripts.remove(i);
				
				break;
			}

			if (this.scripts.length == 0 && this.sites.length == 0)
				Storage.removeDomain(this.name);
		}
	};

	this.__getDBInfo = function () {

		var scripts = [];
		var sites = [];
		
		for (var i = 0; i < this.scripts.length; i++ ) 
			scripts.push(this.scripts[i].__getDBInfo());

		for (var i = 0; i < this.sites.length; i++ ) 
			sites.push(this.sites[i].__getDBInfo());
		
		return {
			
			name: this.name,
			sites: sites,
			scripts: scripts,
			idx: this.idx
		}
	};

	
}
