function DomainMgr (bg) {

	var self = this;

	this.bg = bg;
	this.storage = global_storage;
	this.domains = [];

	this.storage.__getDomains(new_domains => {

		if (new_domains)
			self.domains = new_domains;
		
	});

	this.__createParentFor = function (url) {

		var parent;
		
		if (url.pathname == "/")
			parent = new Domain ({name: url.hostname });
		else
			parent = new Domain ({name: url.hostname, sites: [{name: url.pathname}] }).sites[0];

		return parent;
	};
	
	this.getScriptsForUrl = function (url) {

		return new Promise (
			(resolve, reject) => {

				if (self.domains.indexOf(url.hostname) >= 0) {

					self.storage.getDomain(domain => {
					
						var site = domain.haveSite(url.pathname),
							scripts = domain.scripts;
						
						if (site)
							scripts = scripts.concat(site.scripts);
						
						resolve(scripts);
						
					}, url.hostname);

				} else
					resolve(null);
			});
	};

	this.storeScript = function (script) {

		return new Promise (
			(resolve, reject) => {

				var url = script.getUrl();

				console.log(url);
				
				if (self.domains.indexOf(url.hostname) >= 0) {

					self.storage.getOrCreateDomain(
						domain => {
						
							console.error("Domain: ");
							console.error(domain);
						
							resolve(domain.getOrCreateSite(url.pathname).upsertScript(script));
						
						}, url.hostname || url.href);
				
				} else
					resolve(self.__createParentFor(url).upsertScript(script));
			}
		);
	};

	this.haveInfoForUrl = function (url) {

		return new Promise ((resolve, reject) => {


			if (self.domains.indexOf(url.hostname) >= 0) {
					
				global_storage.getDomain(
					domain => {
					
						if (domain.haveScripts() || domain.haveSite(url.pathname))
							resolve(true);
						else
							resolve(false);
					
					}, url.hostname);
				
			} else
				resolve(false);
			
		});

	};

	/* !!! */
	// this.getEditInfoForUrl = function (url) {

	// 	return new Promise ((resolve, reject) => {
					
	// 		self.storage.getDomain(domain => {
				
	// 			resolve(domain.getEditInfo(url.pathname));
				
	// 		}, url.hostname);
	// 	});
	// };
	
	this.getFullDomains = function (done) {

		var res = [];
		
		async.eachSeries(self.domains,
						 (domain_name, cb) => {
							 
							 self.storage.getDomain(
								 domain => {
								 
									 res.push(domain);
									 cb();
									 
								 }, domain_name);
			
						 }, () => {
							 
							 console.log(res);
							 done(res);
							 
						 });
	};

	this.storeNewDomains = function (changes, area) {

		if (area != "local")
	 		return;
		
		if(changes.domains) {

			console.log("New Domains!");
			console.log(changes.domains);
			self.domains = changes.domains.newValue;
		}
	};
	
	browser.storage.onChanged.addListener(this.storeNewDomains);
}
