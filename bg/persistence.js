//browser.storage.local.clear();

function Storage () {

	/* To do: cacth error */
	var self = this;
	
	this.__get = function (cb, key) {
				
		browser.storage.local.get(key)
			.then(
				values => {
					
					// console.log("Getting: " + key);
					// console.log(values[key]);

					cb(values[key]);
			
				}, console.error
			);	
	};

	this.__set = function (key, val) {

		console.log("Persisting: " + key);
		console.log(val);
		
		var obj = {};
		obj[key] = val;
		
		return browser.storage.local.set(obj);
	};

	this.__remove = function (key) {

		console.log("Removing: " + key);
		
		return browser.storage.local.remove(key);
	};

	/* Domains: */
	this.__getDomains = function (cb) {
		
		self.__get(arr => {

			cb(arr || []);

		}, 'domains');

	};

	this.__setDomains = function (val) {
		
		return self.__set('domains', val);
	};

	this.upsertDomain = function (val) {

		self.__getDomains(
			arr => {

				if (!arr.includes(val.name)) {

					arr.push(val.name);
					self.__setDomains(arr);
					
				}

			}); 
		
		if (val.name.startsWith("*."))
			return self.__upsertSubDomain(val.name.slice(2), val);
		else
			return self.__set('domain-' + val.name, val);
	};
	
	this.getDomain = function (cb, name) {

		if (name.startsWith("*."))
			return self.__getSubDomain(cb, name.slice(2));
		else {

			self.__get(
				domain => {
				
					cb(domain ? new Domain(domain) : null);
				
				}, 'domain-' + name);
		}
	};

	this.removeDomain = function (name) {

		self.__getDomains(
			arr => {

				if (arr.includes(name)) {

					arr.remove(arr.indexOf(name));
					self.__setDomains(arr);
					
				}

			});
		
		if (name.startsWith("*."))
			return self.__removeSubDomain(name.slice(2));
		else
			return self.__remove('domain-' + name);
	};

	this.getOrCreateDomain = function (cb, name) {
		/* To promise!!! */
		if (name.startsWith("*."))
			return self.__getOrCreateSubDomain(cb, name.slice(2));
		else {

			self.getDomain(function (domain) {
				
				if (domain)
					cb(domain);
				else 
					cb(new Domain({name: name}));
				
			}, name);
		}
	};

	/* Options: */
	this.getOptions = function (cb) {
		
		self.__get(cb, 'options');
		
	};
	
	this.setOptions = function (val) {
		
		return self.__set('options', val);
		
	};
	
	this.removeOptions = function () {
		
		return browser.storage.local.remove('options');

	};

	/* Groups: */
	this.__getGroups = function (cb) {
		
		self.__get(arr => {
			
			cb(arr || []);

		}, 'groups');
		
	};

	this.__setGroups = function (val) {
		
		return self.__set('groups', val);
	};
	
	this.getGroup = function (cb, name) {
		
		self.__get(
			group => {
				
				cb(group ? new Group(group) : null);
				
			}, 'group-' + name);
		
	};
	
	this.upsertGroup = function (val) {
		
		self.__getGroups(
			groups => {
				
				if (!groups.includes(val.name)) {

					groups.push(val.name);
					self.__setGroups(groups);
					
				}
			}
		);
		
		return self.__set('group-' + val.name, val);
		
	};
	
	this.removeGroup = function (name) {

		self.__getGroups(
			groups => {
				
				if (groups.includes(name)) {
					
					groups.remove(groups.indexOf(name));
					self.__setGroups(groups);	
					
				}
			}
		);
		
		return self.__remove('group-' + name);
	};

	this.getOrCreateGroup = function (cb, name) { 
		
		self.getGroup(
			group => {
			
				if (group)
					cb(group);
				else 
					cb(new Group({name: name}));
			
			}, name);
	}

	/* Subdomains: */
	this.__getSubDomain = function (cb, keyname) {
		
		self.__get(
			subdomain => {

				cb(subdomain ? new Domain(subdomain) : null);
				
			}, 'subdomains-' + keyname);
		
	};
	
	this.__upsertSubDomain = function (keyname, val) {
		
		return self.__set('subdomains-' + keyname, val);
		
	};
	
	this.__removeSubDomain = function (keyname) {
		
		return self.__remove('subdomains-' + keyname);
	};

	this.__getOrCreateSubDomain = function (cb, keyname) { 
		
		self.__getSubDomain(
			subdomain => {
			
				if (subdomain)
					cb(subdomain);
				else 
					cb(new Domain({name: "*." + keyname}));
				
			}, keyname);
	};

	/* Globals: */
	this.getGlobals = function (cb) {
		
		self.__get(cb, 'globals');		
		
	};
	
	this.setGlobals = function (globals) {

		return self.__set('globals', globals);
		
	};
	
	this.removeGlobals = function () {
		
		return self.__remove('globals');
		
	};

	/* User definitions: */
	this.getUserDefs = function (cb) {
		
		self.__get(defs => { cb(defs || "") }, 'userdefs');
		
	}

	this.setUserDefs = function (literal) {

		return self.__set('userdefs', literal);
		
	}
	
	/* Rules: */
	this.setRules = function (rules) {
		
		return self.__set('rules', rules);
	}
	
	this.getRules = function (cb) {

		self.__get(rules => { cb(rules || []) }, 'rules');
	}
	
	this.removeRules = function () {
		
		return self.__remove('rules');
	}

	/* Proxy Rules: */
	this.setProxyRules = function (rules) {
		
		return self.__set('prules', rules);
	}
	
	this.getProxyRules = function (cb) {

		self.__get(rules => { cb(rules || []) }, 'prules');
	}
	
	this.removeProxyRules = function () {
		
		return self.__remove('prules');
	}
}

let global_storage = new Storage();


