function Script (opt) {
	
	this.uuid = opt.uuid || UUID.generate();
	this.code = opt.code ? opt.code.trim() : "/* JS code (jQuery, async and underscore available) ...*/\n";
	this.parent = opt.parent || null;
	this.name = opt.name || "script_name"; 
	this.disabled = opt.disabled || false;
	this.persisted = opt.code ? true : false;
	
	this.getUrl = () => {
		
		if (this.parent && !this.parent.isGroup()) {
			
			if (this.parent.parent.isSubdomain())
				return null;
			else
				return new URL('http://' + this.parent.parent.name + this.parent.url);
			
		} else
			return null; /* !!! */
	};

	this.remove = () => {
		
		return this.parent 
			? this.parent.removeScript(this.uuid)
			: Promise.resolve();
	};
	
	this.__schedulePersistAt = (to) => {
		
		if (this.persistTID)
			clearTimeout(this.persistTID);

		this.persistTID = setTimeout(this.persist, to);
	};

	this.disabledAt = (url_name) => {
		
		if (this.parent.isGroup()) {

			return url_name ?
				   this.parent.isDisabled(this.uuid, url_name) :
				   this.parent.disabledEverywhere(this.uuid);
		} else
			return this.disabled;
	};

	this.toggleDisableFor = (url_name) => {

		if (this.parent.isGroup()) {

			if (url_name)
				this.parent.toggleDisableFor(this.uuid, url_name);
			else {
				
				if (this.parent.disabledEverywhere(this.uuid)) 
					this.parent.enableEverywhere(this.uuid);
				else
					this.parent.disableEverywhere(this.uuid);
			}
			
		} else {
			
			this.disabled = !this.disabled;
			
		}
		
		this.__schedulePersistAt(500);
	};
	
	this.persist = () => {

		if (!this.persisted)
			this.persisted = true;
		
		if (this.parent) {
			
			if (!this.parent.isResource() && !this.parent.haveScript(this.id))
				this.parent.upsertScript(this);

			return this.parent.persist();

		} else {

			return global_storage.setUserDefs(this.code || " ");
			
		}
	};

	this.includedAt = (url) => {
		
		return this.parent.includes(url);

	};
	
	this.getParentName = () => {
		
		return this.parent ? this.parent.isGroup() ? this.parent.name : (this.parent == this.parent.parent ? this.parent.name : this.parent.parent.name + this.parent.url) : this.name;
		
	};
	
	/* Stringify */
	this.__getDBInfo = () => {

		let me = this;
		
		return {
			
			uuid: me.uuid,
			code: me.code || " ",
			name: me.name,
			disabled: me.disabled
		}
	};
}

function __Script_Bucket (scripts) {

	/* To sets */
	this.scripts = [];
	
	if (scripts) {
		
		for (let script of scripts) {
			
			script.parent = this;
			this.scripts.push(new Script(script));
		}
	} 
	
	this.removeScript = (id) => {
		
		this.scripts.remove(
			this.scripts.findIndex(
				script => {
					
					return script.uuid == id;
				}
			)
		);
		
		return this.isEmpty() ? this.remove() : this.persist();
	}
	
	this.upsertScript = (script) => {
		
		let idx = this.scripts.findIndex(
			exe => {
				return script.uuid == exe.uuid;
			}
		);
		
		if (idx >= 0) {
			
			this.scripts[idx].name = script.name;
			this.scripts[idx].code = script.code;
			this.scripts[idx].disabled = script.disabled;
			
		} else { 	
			
			script.parent = this;
			
			if (script instanceof Script)
				this.scripts.push(script);
			else
				this.scripts.push(new Script(script));
		}
		
		return script;	
	};

	this.haveData = () => {
		
		return this.scripts.length > 0;
		
	};
	
	this.haveScript = (id) => {

		return this.scripts.find(
			script => {
				
				return script.uuid == id;
				
			}
		) || false;
    };

	this.factory = () => {

		return new Script({parent: self});
	};
	
}

function Site (opt) {
	
	this.url = opt.url || null;
	this.parent = opt.parent || null;
	
	__Script_Bucket.call(this, opt.scripts || []);
	
	this.groups = opt.groups || [];
	
	this.isDomain = () => {
		
		return this.url == "/";
		
	};
	
	this.isSubdomain = () => {
		
		return this.url == "/" && (this.name.startsWith("*.") || this.name.endsWith(".*")); /* All subdomains shortcut. */
		
	};
	
	this.isGroup = () => {
		
		return false;
		
	};

	this.isResource = () => {
		
		return false;
		
	};
	
	this.siteName = () => {
		
		let name = this.parent.name + this.url;
		
		return name.slice(-1) == "/" ? name.slice(0, -1) : name;
		
	};

	this.includes = (url) => {

		if (this.parent.isSubdomain()) {
			
			if (this.parent.name.startsWith("*.") && this.parent.name.endsWith(".*")) {

				let parent_group = this.parent.name.slice(2).slice(0, -2);
				let aux = url.hostname.split(".");
				
				do {
					
					aux = aux.slice(1).slice(0, -1);
					
				} while (aux.length && aux.join(".") != parent_group);

				return aux.length ? url.pathname.startsWith(this.url) : false;
				
			} else if (this.parent.name.startsWith("*.")) {

				let parent_group = this.parent.name.slice(2);
				
				return url.hostname.endsWith(parent_group) && url.pathname.startsWith(this.url);
				
			} else if (this.parent.name.endsWith(".*")) {

				let parent_group = this.parent.name.slice(0, -2);
						
				return url.hostname.startsWith(parent_group) && url.pathname.startsWith(this.url);
			}
			
		} else {
			
			return url.name().startsWith(this.siteName());
			
		}
	}
	
	this.isEmpty = () => {
		
		return !this.scripts.length && !this.groups.length; 
		
	};
	
	this.appendGroup = (group) => {
		
		if (!this.groups.includes(group.name))
			this.groups.push(group.name);
		
		if (!group.sites.includes(this.siteName()))
			group.sites.push(this.siteName());	
	};

	this.removeGroup = (group) => {
		
		this.groups.remove(this.groups.indexOf(group.name));
		group.sites.remove(group.sites.indexOf(this.siteName()));
		
		if (this.isEmpty())
			this.remove();
		
		if (group.isEmpty())
			group.remove();
	};
	
	this.remove = () => {
		
		return this.parent.removeSite(this.url);	
	};

	this.persist = () => {
		
		return this.parent.persist();
		
	};
	
	this.mergeInfo = (imported) => {
		
		for (script of imported.scripts)
			this.upsertScript(script);
		
		for (group_name of imported.groups) {
			
			if (!this.groups.includes(group_name))
				this.groups.push(group_name);
			
			/* The other half to be done from manager */
			
		}
	}
	
	/* Stringify */
	this.__getDBInfo = () => {

		let me = this;
		
		return {

			url: me.url,
			groups: me.groups,
			scripts: me.scripts.map(
				script => {
					return script.__getDBInfo();
				}
			)
		}
	};
}

function Domain (opt) {
	
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
	
	this.isEmpty = () => {
		
		return !this.scripts.length && !this.sites.length && !this.groups.length;
		
	};

	this.getScriptCount = () => {

		let count = this.scripts.length;
		
		for (let site of this.sites)
			count += site.scripts.length;

		return count;
	};
	
	this.haveData = () => {
		
		return this.scripts.length ||
			this.sites.find(
				site => {

					return site.haveData();
					
				}
				
			) || false;
	};

	this.schedulePersistAt = (to) => {

		if (this.pID)
			clearTimeout(this.pID);
		
		this.pID = setTimeout(
			() => {

				this.persist();

			}, to); 
	};
	
	this.persist = () => {

		return new Promise (
			(resolve, reject) => {
				
				global_storage.upsertDomain(this.__getDBInfo())
					.then(() => {
						
						resolve(this);
						
					}, reject);
			}
		);
	};
	
	this.remove = () => {
		
		return new Promise (
			(resolve, reject) => {
				
				global_storage.removeDomain(this.name)
					.then(() => {
						
						resolve(this);
						
					}, reject);
			}
		);				
	};	
	
	this.haveSites = () => {
		
		return this.sites.length > 0;
	};
	
	this.haveSite = (pathname) => {

		return (!pathname || pathname == "/") ? this : this.sites.find(site => {	
			
			return site.url == pathname;

		}) || false;
	};
	
	this.getOrCreateSite = (pathname) => {
		
		if (!pathname || pathname == "/")
			return this;
		
		let site = this.haveSite(pathname);
		
		if (site)
			return site;
		
		let nsite = new Site ({url: pathname, parent: this});	
		this.sites.push(nsite);
	
		return nsite;
	};
	
	this.haveScript = (id) => {
		
		return this.scripts.find(
			script => {
				
				return script.uuid == id;
				
			}
			
		) || this.sites.map(
			
			site => {
				
				return site.haveScript(id);
				
			}).find(script => {
				
				return script;
				
			}) || false;
	};
	
	this.removeSite = (pathname) => {
		
		if (pathname == "/")
			return this.remove();
		
		this.sites.remove(
			this.sites.findIndex(
				site => {
					return site.url == pathname;
				}
			)
		);
		
		return this.isEmpty() ?
			this.remove() :
			this.schedulePersistAt(350);		
	};
	
	this.mergeInfo = (imported) => {

		for (script of imported.scripts)
			this.upsertScript(script);

		for (site of imported.sites) 	
			this.getOrCreateSite(site.url).mergeInfo(site);
	};

	this.getJSON = () => {

		return JSON.stringify(this.__getDBInfo());
		
	};
	
	this.__getDBInfo = () => {

		let me = this;
		
		return {
			
			name: me.name,
			groups: me.groups,
			
			sites: me.sites.map(
				site => {
					return site.__getDBInfo();
				}
			),
			
			scripts: me.scripts.map(
				script => {
					return script.__getDBInfo();
				}
			)
		}
	};
}

function Group (opt) {

	__Script_Bucket.call(this, opt.scripts || []);
	
	this.name = opt.name || UUID.generate().split("-").pop();
	this.sites = opt.sites || [];
	this.disabledAt = opt.disabledAt || [];
	
	this.isDomain = () => {
		
		return false;
		
	};

	this.isSubdomain = () => {
		
		return false;
		
	};
	
	this.isGroup = () => {
		
		return true;	
	};

	this.isResource = () => {
		
		return false;
		
	};
	
	this.isEmpty = () => {
		
		return !this.sites.length && !this.scripts.length; 
	};

	this.getScriptCount = () => {

		return this.scripts.length;
		
	};
	
	this.persist = () => {

		return new Promise(
			(resolve, reject) => {
				
				global_storage.upsertGroup(this.__getDBInfo())
					.then(
						() => {
							
							resolve(this);
							
						}, reject
					);
			}
		);
	};

	this.remove = () => {
		
		return new Promise (
			(resolve, reject) => {
				
				global_storage.removeGroup(this.name)
					.then(
						() => {
							
							resolve(this);
							
						}, reject);
			}
		);
	};

	this.appendSite = (site) => {
		
		if (!this.sites.includes(site.siteName()))
			this.sites.push(site.siteName());
		
		if (!site.groups.includes(this.name))
			site.groups.push(this.name);
	};

	this.removeSite = (site) => {
		
		this.sites.remove(this.sites.indexOf(site.siteName()));
		site.groups.remove(site.groups.indexOf(this.name));
		
		let disabled = -1;
		
		do {
			
			this.disabledAt.remove(disabled);
			
			disabled = this.disabledAt.findIndex(
				tuple => {
					
					return tuple.url.startsWith(site.siteName());
				}
			);
			
		} while (disabled >= 0);
		
		if (this.isEmpty())
			this.remove();

		if (site.isEmpty())
			site.remove();
		
	}; 

	this.includes = (url) => {

		return this.sites.find(
			site => {

				let split = site.split("/");
				let site_path = split.slice(1).join();

				if (split[0].startsWith("*.") && split[0].endsWith(".*")) {

					let site_group = split[0].slice(2).slice(0, -2);
					let aux = url.hostname.split(".");
						
					do {
							
						aux = aux.slice(1).slice(0, -1);
						
					} while (aux.length && aux.join(".") != site_group);
						
					return aux.length ? url.pathname.startsWith(site_path) : false;

				} else if (split[0].startsWith("*.")) {
					
					let site_group = split[0].slice(2);
					
					return url.hostname.endsWith(site_group) && url.pathname.startsWith(site_path);
					
				} else if (split[0].endsWith(".*")) {

					let site_group = split[0].slice(0, -2);
					
					return url.hostname.startsWith(site_group) && url.pathname.startsWith(site_path);
					
				} else {
					
					return url.name().startsWith(site);
					
				}
			}
			
		) ? true : false;
	};
	
	this.haveSite = (site_name) => {
		
		return this.sites.find(
			site => {	

				return site == site_name;
				
			}) || false;
	};
	
	this.mergeInfo = (imported) => {

		for (let script of imported.scripts)
			this.upsertScript(script);
		
		for (let site_name of imported.sites) {
			
			if (!this.sites.includes(site_name))
				this.sites.push(site_name);
			
			/* 
			   The other half of the relation to be 
			   done from mgr! 
			   
			 */
		}

		for (let tuple of imported.disabledAt) {

			let script_mine = this.scripts.find(
				script => {
					return script.uuid == tuple.id;
				}
			) ? true : false;

			let site_mine = this.sites.find(
				site => {
					return site == tuple.url;
				}
			) ? true : false;
			
			if (site_mine && script_mine) {
				
				let idx = this.disabledAt.findIndex(
					stored => {
						
						return stored.id == tuple.id && tuple.url == stored.url;	
					}
				);
				
				if (idx < 0)
					this.disabledAt.push({id: tuple.id, url: tuple.url});
			}
		}
	};
	
	this.isDisabled = (uuid, url_name) => {
		
		return this.disabledAt.find(
			
			tuple => {

				return (tuple.id == uuid && url_name.startsWith(tuple.url));
				
			}
			
		) ? true : false;
	}

	this.toggleDisableFor = (uuid, url_name) => {
		
		let idx = -1;
		let disabled = false;
		
		do {

			idx = this.disabledAt.findIndex(
				tuple => {
					
					return tuple.id == uuid && url_name.startsWith(tuple.url);
					
				}
			);
			
			if (idx >= 0) {

				this.disabledAt.remove(idx);
				disabled = true;
				
			} else if (!disabled)
				this.disabledAt.push({id: uuid, url: url_name});
			
		} while (idx >= 0);
	}

	this.disabledEverywhere = (uuid) => {
		
		return this.sites.length && this.disabledAt.filter(
			tuple => {
				
				return tuple.id == uuid;
			}
			
		).length >= this.sites.length;
	};
	
	this.disableEverywhere = (uuid) => {
		
		for (let site of this.sites) {
			
			let idx = this.disabledAt.findIndex(
				tuple => {
				
					return tuple.id == uuid && tuple.url == site;

				}
			
			);
		
			if (idx < 0)
				this.disabledAt.push({id: uuid, url: site});
		}
	}

	this.enableEverywhere = (uuid) => {

		let idx = -1;
		
		for (let site of this.sites) {

			do {
				
				let idx = this.disabledAt.findIndex(
					tuple => {
						
						return tuple.id == uuid && tuple.url.startsWith(site);
						
					}
				);
				
				if (idx >= 0)
					this.disabledAt.remove(idx);
				
			} while (idx >= 0);
		}
	}

	/* ??? */
	
	this.isMySite = (site_name) => {
		
		return this.sites.find(
			site => {
				
				return site == site_name;
			}
			
		) ? true : false;
	}
	
	/* -- ??? -- */
	
	this.getJSON = () => {

		return JSON.stringify(this.__getDBInfo());
		
	};
	
	this.__getDBInfo = () => {

		let me = this;
		
		return {
			
			name: me.name,
			sites: me.sites,
			disabledAt: me.disabledAt,
			scripts: me.scripts.map(
				script => {
					return script.__getDBInfo();
				}
			)
		}
	};	
}


function Resource (opt) {

	if (!opt || !opt.name)
		return null;
	
	this.name = opt.name;
	this.file = opt.file || null;
	this.type = opt.type || "application/octet-stream";
	this.parent = this; /* Compat. */
	
	this.isGroup = () => {

		return false;
		
	}

	this.isDomain = () => {
		
		return false;
		
	};
	
	this.isSubdomain = () => {
		
		return false;
		
	};

	this.isResource = () => {
		
		return true;
		
	};
	
	this.readTextContent = () => {
		
		return new Promise(
			(resolve, reject) => {
				
				let reader = new FileReader();
				
				reader.onload = () => {
					
					resolve(reader.result);
				}
				
				reader.onerror = () => {
					
					reject(reader.error);
				}
		
				reader.readAsText(this.file);
				
			}
		);
	};

	this.setTextContent = (text) => {

		let me = this;
		
		this.file = new File([text], this.file ? this.file.name : this.name, {type: me.type});
		
	};
	
	this.persist = () => {
		
		return this.storage.setResource(
			
			this.__getDBInfo()
				
		);
	};
	
	this.remove = () => {
		
		return this.storage.removeResource(this.name);
		
	};
	
	
	this.__getDBInfo = () => {
		
		let me = this;
		
		return {
			
			name: me.name,
			type: me.type,
			file: me.file	
		}
	};
}
