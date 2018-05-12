function Storage () {

	
	this.__get = (cb, key) => {
				
		browser.storage.local.get(key)
			.then(
				values => {

					cb(values[key]);
			
				}, console.error
			);	
	};

	this.__set = (key, val) => {

		console.log("Persisting: " + key);
		console.log(val);
		
		var obj = {};
		obj[key] = val;
		
		return browser.storage.local.set(obj);
	};

	this.__remove = (key) => {
		
		console.log("Removing: " + key);
		
		return browser.storage.local.remove(key);
	};

	/* Domains: */
	this.__getDomains = (cb, simple) => {
		
		this.__get(info => {

			if (simple)
				cb(info || []);
			else {

				this.__get(disabled => {
				
					cb( { info: info || [], disabled: disabled || [] } );
					
				}, 'disabled-domains');
				
			}
			
		}, 'domains');
	};

	this.__setDomains = (val) => {
		
		return this.__set('domains', val);
	};

	this.upsertDomain = (val) => {

		this.__getDomains(
			arr => {

				if (!arr.includes(val.name)) {

					arr.push(val.name);
					this.__setDomains(arr);
					
				}

			}, true); 
		
		if (val.name.startsWith("*.") && !val.name.endsWith(".*"))
			
			return this.__upsertSubDomain(val.name.slice(2), val);
		
		else if (val.name.endsWith(".*") && !val.name.startsWith("*."))
			
			return this.__upsertSuperDomain(val.name.slice(0, -2), val);
		
		else if (val.name.endsWith(".*") && val.name.startsWith("*."))
			
			return this.__upsertDomainSet(val.name.slice(2).slice(0, -2), val);
		
		else
			return this.__set('domain-' + val.name, val);
	};
	
	this.getDomain = (cb, name) => {
		
		if (name.startsWith("*.") && !name.endsWith(".*"))
			
			return this.__getSubDomain(cb, name.slice(2));

		else if(!name.startsWith("*.") && name.endsWith(".*"))
			
			return this.__getSuperDomain(cb, name.slice(0, -2));

		else if(name.startsWith("*.") && name.endsWith(".*"))
			
			return this.__getDomainSet(cb, name.slice(2).slice(0, -2));
		
		else {
			
			this.__get(
				domain => {
					
					cb(domain ? new Domain(domain) : null);
					
				}, 'domain-' + name);
		}
	};

	this.removeDomain = (name) => {

		this.__getDomains(
			arr => {

				if (arr.includes(name)) {

					arr.remove(arr.indexOf(name));
					this.__setDomains(arr);
					
				}

			}, true);
		
		if (name.startsWith("*.") && !name.endsWith(".*"))
			return this.__removeSubDomain(name.slice(2));
		else if (name.endsWith(".*") && !name.startsWith("*."))
			return this.__removeSuperDomain(name.slice(0, -2));
		else if (name.endsWith(".*") && name.startsWith("*."))
			return this.__removeDomainSet(name.slice(2).slice(0, -2));
		else
			return this.__remove('domain-' + name);
	};

	this.getOrCreateDomain = (cb, name) => {

		if (name.startsWith("*.") && !name.endsWith(".*"))
			return this.__getOrCreateSubDomain(cb, name.slice(2));
		else if(!name.startsWith("*.") && name.endsWith(".*"))
			return this.__getOrCreateSuperDomain(cb, name.slice(0, -2));
		else if(name.startsWith("*.") && name.endsWith(".*"))
			return this.__getOrCreateDomainSet(cb, name.slice(2).slice(0, -2));
		else {

			this.getDomain(
				domain => {
				
					if (domain)
						cb(domain);
					else 
						cb(new Domain({name: name}));
					
				}, name);
		}
	};

	this.setDisabledDomains = (array) => {
		
		return this.__set('disabled-domains', array);
		
	};
	
	/* Options: */
	this.getOptions = (cb) => {
		
		this.__get(cb, 'options');
		
	};
	
	this.setOptions = (val) => {
		
		return this.__set('options', val);
		
	};
	
	this.removeOptions = () => {
		
		return browser.storage.local.remove('options');

	};

	/* Groups: */
	this.__getGroups = (cb) => {
		
		this.__get(
			arr => {
			
				cb(arr || []);

			}, 'groups');	
	};

	this.__setGroups = (val) => {
		
		return this.__set('groups', val);
	};
	
	this.getGroup = (cb, name) => {
		
		this.__get(
			group => {
				
				cb(group ? new Group(group) : null);
				
			}, 'group-' + name);
		
	};
	
	this.upsertGroup = (val) => {
		
		this.__getGroups(
			groups => {
				
				if (!groups.includes(val.name)) {

					groups.push(val.name);
					this.__setGroups(groups);
					
				}
			}
		);
		
		return this.__set('group-' + val.name, val);
		
	};
	
	this.removeGroup = (name) => {

		this.__getGroups(
			groups => {
				
				if (groups.includes(name)) {
					
					groups.remove(groups.indexOf(name));
					this.__setGroups(groups);	
					
				}
			}
		);
		
		return this.__remove('group-' + name);
	};

	this.getOrCreateGroup = (cb, name) => { 
		
		this.getGroup(
			group => {
			
				if (group)
					cb(group);
				else 
					cb(new Group({name: name}));
			
			}, name);
	}

	/* Subdomains: */
	this.__getSubDomain = (cb, keyname) => {
		
		this.__get(
			subdomain => {

				cb(subdomain ? new Domain(subdomain) : null);
				
			}, 'subdomain-' + keyname);
		
	};
	
	this.__upsertSubDomain = (keyname, val) => {
		
		return this.__set('subdomain-' + keyname, val);
		
	};
	
	this.__removeSubDomain = (keyname) => {
		
		return this.__remove('subdomain-' + keyname);
	};

	this.__getOrCreateSubDomain = (cb, keyname) => { 
		
		this.__getSubDomain(
			subdomain => {
			
				if (subdomain)
					cb(subdomain);
				else 
					cb(new Domain({name: "*." + keyname}));
				
			}, keyname);
	};

	/* Domain Groups */
	this.__getDomainSet = (cb, keyname) => {
		
		this.__get(
			domainset => {

				cb(domainset ? new Domain(domainset) : null);
				
			}, 'domainset-' + keyname);
		
	};
	
	this.__upsertDomainSet = (keyname, val) => {
		
		return this.__set('domainset-' + keyname, val);
		
	};
	
	this.__removeDomainSet = (keyname) => {
		
		return this.__remove('domainset-' + keyname);
	};

	this.__getOrCreateDomainSet = (cb, keyname) => { 
		
		this.__getDomainSet(
			domainset => {
				
				if (domainset)
					cb(domainset);
				else 
					cb(new Domain({name: "*." + keyname + ".*"}));
				
			}, keyname);
	};
	
	/* Superdomains */
	this.__getSuperDomain = (cb, keyname) => {
		
		this.__get(
			superdomain => {

				cb(superdomain ? new Domain(superdomain) : null);
				
			}, 'superdomain-' + keyname);
		
	};
	
	this.__upsertSuperDomain = (keyname, val) => {
		
		return this.__set('superdomain-' + keyname, val);
		
	};
	
	this.__removeSuperDomain = (keyname) => {
		
		return this.__remove('superdomain-' + keyname);
	};
	
	this.__getOrCreateSuperDomain = (cb, keyname) => { 
		
		this.__getSuperDomain(
			subdomain => {
				
				if (subdomain)
					cb(subdomain);
				else 
					cb(new Domain({name: keyname + ".*"}));
				
			}, keyname);
	};

	/* Globals: */
	this.getGlobals = (cb) => {
		
		this.__get(cb, 'globals');		
		
	};
	
	this.setGlobals = (globals) => {

		return this.__set('globals', globals);
		
	};
	
	this.removeGlobals = () => {
		
		return this.__remove('globals');
		
	};

	/* User definitions: */
	this.getUserDefs = (cb) => {
		
		this.__get(defs => { cb(defs || "") }, 'userdefs');
		
	}

	this.setUserDefs = (literal) => {

		return this.__set('userdefs', literal);
		
	}
}

let global_storage = new Storage();


