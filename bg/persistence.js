function onError (error) {
	console.error(`Persistence Error: ${error}`);
}

//browser.storage.local.clear();

function Storage () {

	/* To do: cacth error */
	var self = this;
	
	this.__get = function (cb, key) {
				
		browser.storage.local.get(key)
			.then(
				values => {
					
					console.log("Getting: " + key);
					console.log(values[key]);

					cb(values[key]);
			
				}, onError
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

	this.__getDomains = function (cb) {
		
		self.__get(arr => {

			cb(arr || []);

		}, 'domains');

	};

	this.__setDomains = function (val) {
		
		return self.__set('domains', val);
	};

	this.__upsertDomain = function (name, val) {

		return self.__set('domain-' + name, val);
	};
	
	this.getDomain = function (cb, name) {
		
		self.__get(
			domain => {
				
				cb(domain ? new Domain(domain) : null);
				
			}, 'domain-' + name);
	};

	this.__removeDomain = function (name) {
		
		return self.__remove('domain-' + name);
	};

	this.getOrCreateDomain = function (cb, name) {
		
		self.getDomain(function (domain) {
	
			if (domain)
				cb(domain);
			else 
				cb(new Domain({name: name}));
			
		}, name);
	};

	this.getOptions = function (cb) {
		
		self.__get(cb, 'options');
		
	};

	this.setOptions = function (val) {

		return self.__set('options', val);
	};

	this.removeOptions = function () {
	
		return browser.storage.local.remove('options');
	};
	
	this.getGroups = function (cb) {
		
		self.__get(arr => {
			
			cb(arr || []);

		}, 'groups');
		
	};

	this.setGroups = function (val) {

		return self.__set('groups', val);
	};

	/* Groups: Revisar este y domains */
	this.getGroup = function (cb, name) {
		
		self.__get(
			group => {
				
				cb(group ? new Group(group) : null);
				
			}, 'group-' + name);
		
	};
	
	this.upsertGroup = function (val) {
		
		return self.__set('group-' + val.name, val);
		
	};
	
	this.removeGroup = function (name) {
		
		return self.__remove('group-' + name);
	};

	this.getOrCreateGroup = function (cb, name) { 
		
		self.getGroup(function (group) {
			
			if (group)
				cb(group);
			else 
				cb(new Group({name: name}));
			
		}, name);
	}

	/* Subdomains: */
	this.getSubDomain = function (cb, keyname) {
		
		self.__get(
			subdomain => {

				cb(subdomain ? new AllSubDomainsFor(subdomain) : null);
				
			}, 'subdomain-' + keyname);
		
	};
	
	this.upsertSubDomain = function (keyname, val) {
		
		return self.__set('subdomain-' + keyname, val);
		
	};
	
	this.removeSubDomain = function (keyname) {
		
		return self.__remove('subdomain-' + keyname);
	};

	this.getOrCreateSubDomain = function (cb, keyname) { 
		
		self.getSubDomain(
			subdomain => {
			
				if (subdomain)
					cb(subdomain);
				else 
					cb(new AllSubDomainsFor({name: "*." + keyname, groups: []}));
				
			}, keyname);
	};

	/* Globals */

	this.getGlobalIDs = function (cb) {

		self.__get(ids => { cb (ids || []) }, 'globals');
		
	};

	this.setGlobalIDs = function (ids) {

		self.__set('globals', ids);
		
	};
	
	this.getGlobal = function (cb, id) {
		
		self.__get(cb, 'global-' + id);		
		
	};
	
	this.setGlobal = function (global) {

		self.getGlobalIDs(
			ids => {
				
				if (!ids.includes(global.id)) {

					ids.push(global.id);
					self.setGlobalIDs(ids);
					
				}
				
				self.__set('global-' + global.id, global);
				
			});
	};

	this.removeGlobal = function (global) {

		self.getGlobalIDs(
			ids => {
				
				if (ids.includes(global.id)) {

					ids.remove(ids.indexOf(global.id));
					self.setGlobalIDs(ids);

					self.__remove('global-' + global.id);
					
				}
			});
	};
	
}

let global_storage = new Storage();


