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

function onError (err) {
	console.error(err);
}

var cipher = XORCipher;
// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function(from, to) {
	
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;

	return this.push.apply(this, rest);

};

browser.storage.local.clear();

function Storage () {

	/* To do cacth error */
	var self = this;
	
	this.__get = function (cb, key) {
		
		var gettingSites = browser.storage.local.get(key);
		
		gettingSites.then((values) => {

			console.log("Getting: " + key);
			console.log(values[key]);

			cb(values[key]);
		});
		
	};

	this.__set = function (key, val) {

		console.log("Persisting: " + key);
		console.log(val);

		var obj = {};
		obj[key] = val;
		
		browser.storage.local.set(obj).then(null, onError);
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

	this.getDomain = function (cb, name) {
		
		this.__get(domain => {
			
			cb(new Domain(domain));

		}, 'domain-' + name);
	};

	this.__removeDomain = function (name) {
		
		this.__remove('domain-' + name);
	};

	this.getOrCreateDomain = function (cb, name) {

		this.getDomain (domain => {

			/* console.log("My domain: ");
			   console.log(domain); */
			
			if (Object.keys(domain).length) {	
				
				cb(domain);

			} else {

				self.__getDomains(arr => {

					/* console.log("Init Array: ");
					   console.log(arr);
					   console.log(arr.domains); */
					
					/* arr = new Object(); */
					if (!arr)
						arr = new Array();
					
					arr.push(name);
					
					self.__setDomains(arr);
					
					cb(new Domain({name: name, idx: arr.length}));
				});	
			}
			
		}, name);
		
	};
	
	this.__emmitChanges = function (changes, area) {

		if (area != "local")
			return;
		
		for (var item of Object.keys(changes)) {
			
			if (item == "domains") 
				self.bg.domains = changes[item].newValue;
		}
	};

	browser.storage.onChanged.addListener(this.__emmitChanges);
}

var global_storage = new Storage();

function Script (opt) {

	var self = this;
	
	this.uuid = opt.uuid || UUID.generate();
	this.code = opt.code || null; // ? opt.enc.toString() : cipher.encode(this.uuid, opt.code);

	/* console.log("Inner code: ");
	   console.log(this.code.toString()); */
	
	this.get = function () {

		/* var res = cipher.decode(this.uuid, this.code.toString());
		   console.log("Inner DeCoded: ");
		   console.log(res); */
		return self.code;//res;

	};
	
	this.__getDBInfo = function () {

		return {
			
			uuid: self.uuid,
			code: self.code
		}
	};
}

function Site (opt) {

	var self = this;
	
	this.url = opt.url || null;

	this.scripts = [];
	if (opt.scripts) {

		for (var script of opt.scripts ) {

			this.scripts.push(new Script(script));
		}

	} 

	this.__getDBInfo = function () {

		var scripts = [];
		
		for (var i = 0; i < this.scripts.length; i++ ) 
			scripts.push(this.scripts[i].__getDBInfo());
		
		return {
			
			url: self.url,
			scripts: scripts
		}
	}
}

function Domain (opt) {

	var self = this;

	if (!opt || !opt.name)
		return null;
	
	this.name = opt.name;

	if (!this.name)
		return;

	this.idx = opt.idx || null;
	
	this.scripts = [];
	if (opt.scripts) {

		for (var script of opt.scripts) {

			this.scripts.push(new Script(script));
		}

	} 

	this.sites = [];
	if (opt.sites) {

		for (var site of opt.sites) {

			this.sites.push(new Site(site));
		}

	}

	this.storage = global_storage;
	
	this.persist = function () {
		
		self.storage.__upsertDomain(self.name, self.__getDBInfo());
	};
	
	this.remove = function () {

		if (self.idx) {
			
			self.storage.__getDomains(function(arr) {
				
				arr.remove(self.idx - 1);
				
			});

			self.storage.__removeDomain(self.name);
		}
	};
	
	this.has = function(url) {
		
		for (site of this.sites) {
				
			if (site.url == url)
				return site;
			
		}
		
		return null;
	};

	this.getOrCreateSite = function (url) {

		var site = this.has(url);
		var n;
		
		if (site)
			return site;

		n = new Site ({url: url});
		
		this.sites.push(n);
		
		return n;
	};

	this.__getDBInfo = function () {

		var scripts = [];
		var sites = [];
		
		for (var i = 0; i < this.scripts.length; i++ ) 
			scripts.push(this.scripts[i].__getDBInfo());

		for (var i = 0; i < this.sites.length; i++ ) 
			sites.push(this.sites[i].__getDBInfo());
		
		return {
			
			name: self.name,
			sites: sites,
			scripts: scripts,
			idx: self.idx
		}
	};

	
}
