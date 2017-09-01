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

function onError (error) {
	console.log(`Error: ${error}`);
}

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
					
					cb(new Domain({name: name}));
				});	
			}
			
		}, name);
		
	};

	this.getOptions = function (cb) {

		this.__get(opts => {

			
			cb(new Options(opts || {}));
			
		}, 'options');


	};

	this.setOptions = function (val) {

		this.__set('options', val);
	};

	this.getOptAndDomains = function (done) {

		var res = {};
		
		this.getOptions(opts => {

			res.opts = opts;
			
			self.__getDomains(domains => {

				res.domains = [];
				
				async.eachSeries(domains, function (domain_name, cb) {

					self.getDomain(domain => {

						res.domains.push(domain);
						cb();

					}, domain_name);
					
				}, function () {
					
					done(res);

				});
				
			});

		});

	};
	
	this.__emmitChanges = function (changes, area) {

		if (area != "local")
			return;
		
		for (item of Object.keys(changes)) {

			switch (item) {
				case "domains":
					if (changes[item].newValue)
						self.bg.domains = changes[item].newValue;
					else
						self.bg.domains = [];

					break;
					
				case "options":
					if (changes[item].newValue)
						self.bg.options = changes[item].newValue;
					else
						self.bg.options = {};

					break;
			}
		}
	};

	browser.storage.onChanged.addListener(this.__emmitChanges);
}

var global_storage = new Storage();

function Options (opt) {

	var self = this;
	
	this.editor = opt.editor || {

		showPrintMargin: false,
		showGutter: false,
		fontSize: 10,
		collapsed: false,
		theme: "twilight"

	};

	this.__getDBInfo = function () {
		
		return {
			
			editor: self.editor
		}
		
	};
}

function Script (opt) {

	var self = this;
	
	this.uuid = opt.uuid || UUID.generate();
	this.code = opt.code || null; // ? opt.enc.toString() : cipher.encode(this.uuid, opt.code);
	this.parent = opt.parent || null;
	
	/* console.log("Inner code: ");
	   console.log(this.code.toString()); */
	
	this.get = function () {

		/* var res = cipher.decode(this.uuid, this.code.toString());
		   console.log("Inner DeCoded: ");
		   console.log(res); */
		return self.code;//res;

	};

	this.getUrl = function () {

		if (self.parent.isDomain())
			return self.parent.name;
		else 
			return self.parent.parent.name + self.parent.url;
		
	};

	this.remove = function () {

		self.parent.removeScript(self.uuid);
				
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
	this.parent = opt.parent || null;
	
	this.scripts = [];
	if (opt.scripts) {

		for (script of opt.scripts ) {

			script.parent = this;
			this.scripts.push(new Script(script));
		}

	} 

	this.isDomain = function() {

		return false;
		
	};

	this.removeScript = function (id) {
		
		var i = 0;
		
		for (script of self.scripts) {
			
			if (script.uuid == id) {
				self.scripts.remove(i);
				
				if (self.isEmpty())
					self.remove();
				
				return;
			}
			
			i ++;
		}	
	};

	this.findS = function (id) {
               
        for (script of self.scripts) {
            if (script.uuid == id)
                return script;
        }

        return null;
    };

	this.remove = function () {

		self.parent.removeSite(self.url);
		
	};
	
	this.isEmpty = function () {

		if (!self.isDomain)
			return self.scripts.length > 0;
		else 
			return self.scripts.length > 0 && self.sites.length > 0;
	};
	
	this.upsertScript = function (literal, uuid) {

		if (uuid) 	
			self.findScript(uuid).code = unescape(literal.toString());
		else 
			self.scripts.push(new Script({code: unescape(literal.toString() ) } ) );
		
	};
	
	this.__getDBInfo = function () {

		var scripts = [];
		
		for (var i = 0; i < this.scripts.length; i++ ) 
			scripts.push(this.scripts[i].__getDBInfo());
		
		return {
			
			url: self.url,
			scripts: scripts
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

	this.isDomain = function() {

		return true;
		
	};
	
	this.persist = function () {
		
		self.storage.__upsertDomain(self.name, self.__getDBInfo());
	};
	
	this.remove = function () {
	
		self.storage.__getDomains(arr => {
			
			var idx = arr.indexOf(self.name);
			
			if (idx) {
				
				arr.remove(idx);
				self.storage.__removeDomain(self.name);
			}
		});		
	};
	
	this.haveScripts = function () {
		
		return this.scripts.length > 0;

	};

	this.haveSites = function () {
		
		return this.sites.length > 0;

	};

	/* !!! */
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

	this.findScript = function (id) {

		for (script of self.scripts) {
			if (script.uuid == id)
				return script;
		}

		for (site of self.sites) {

			var script = site.findS(id);

			if (script)
				return script;
		}

		return null;
	};

	this.removeScript = function (id) {
		
		var i = 0;
		
		for (script of self.scripts) {
			
			if (script.uuid == id) {
				self.scripts.remove(i);
				
				if (self.isEmpty())
					self.remove();
				
				return;
			}
			
			i ++;
		}	
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
	
	this.getEditInfo = function (url) {

		/* The domain must have @url */

		var my_site = self.has(url);

		if (my_site)
			my_site = my_site.__getDBInfo();
		
		return {
			name: self.name,
			site: my_site,
			scripts: self.scripts.map(script => {
				return script.__getDBInfo();
			})
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
			
			name: self.name,
			sites: sites,
			scripts: scripts
		}
	};
}
