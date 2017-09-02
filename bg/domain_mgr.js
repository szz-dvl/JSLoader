function DomainArray (domains) {

	var self = this;
	
	Array.call(this);

	domains.forEach(domain => {
		
		this.push(domain);
		
	});
	
	this.get = function (domain_name) {

		return self.filter(domain => {
			return domain.name == domain_name;
		})[0];

	};

	this.erase = function (domain_name) {

		self.remove(self.findIndex(domain => {
					
			return domain.name == domain_name;
					
		}));
	};
}

function DomainMgr (bg) {

	var self = this;

	this.bg = bg;
	this.storage = global_storage;
	this.domains = [];

	this.storage.__getDomains(new_domains => {

		if (new_domains)
			self.domains = new_domains;
		
	});

	this.getScriptsForUrl = function (url) {

		return new Promise ((resolve, reject) => {

			for (domain_name of self.domains) {

				if ( url.hostname == domain ) {

					self.storage.getDomain(domain => {
	
						var site = domain.haveSite(url.pathname);

						if (site)
							scripts = domain.scripts.concat(site.scripts);
						
						resolve(scripts);
						
					}, domain_name);

				}
				
			}

			resolve(null);
		});
	};

	this.haveInfoForUrl = function (url) {

		return new Promise ((resolve, reject) => {

			for (domain_name of self.domains) {
				
				if ( url.hostname == domain_name) {
					
					global_storage.getDomain(domain => {
						
						if (domain.haveScripts() || domain.haveSite(url.pathname))
							resolve(true);
						
					}, domain_name);
				}
			}

			resolve(false);
			
		});

	};

	this.getEditInfoForUrl = function (url) {

		return new Promise ((resolve, reject) => {
					
			self.storage.getDomain(domain => {
				
				resolve(domain.getEditInfo(url.pathname));
				
			}, url.hostname);
		});
	};

	this.getFullDomains = function (done) {

		var res = new DomainArray();
		
		async.eachSeries(self.domains, (domain_name, cb) => {
			
			self.storage.getDomain(domain => {
				
				res.push(domain);
				cb();
				
			}, domain_name);
			
		}, () => {
			
			done(res);
			
		});
	}

	

}
