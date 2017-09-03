function onError (error) {
	console.log(`Error: ${error}`);
}

//browser.storage.local.clear();

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

		console.log("Removing: " + key);
		/* this.__set(key, {}); */
		
		browser.storage.local.remove(key).then(null, onError);
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

			
			if (Object.keys(domain).length) {	
				
				cb(domain);
				
			} else {

				cb(new Domain({name: name}));
			}
			
		}, name);
		
	};

	this.getOptions = function (cb) {
		
		self.__get(cb, 'options');
		
	};

	this.setOptions = function (val) {

		self.__set('options', val);
	};

	/* this.getOptAndDomains = function (done) {

	   var res = {};
	   
	   this.getOptions(opts => {

	   res.opts = opts;
	   
	   self.__getDomains(domains => {

	   res.domains = [];
	   
	   async.eachSeries(domains, (domain_name, cb) => {

	   self.getDomain(domain => {

	   res.domains.push(domain);
	   cb();

	   }, domain_name);
	   
	   }, () => {
	   
	   done(res);

	   });
	   
	   });

	   });

	   }; */
	
	// this.__emmitChanges = function (changes, area) {

	// 	if (area != "local")
	// 		return;
		
	// 	for (item of Object.keys(changes)) {

	// 		switch (item) {
	// 			case "domains":
	// 				if (changes[item].newValue)
	// 					self.bg.domains = changes[item].newValue;
	// 				else if (!self.bg.domains)
	// 					self.bg.domains = [];

	// 				break;
					
	// 			case "options":
	// 				if (changes[item].newValue)
	// 					self.bg.options = new Options(changes[item].newValue);
	// 				else if (!self.bg.options)
	// 					self.bg.options = new Options();

	// 				break;
	// 		}
	// 	}
	// };

	// browser.storage.onChanged.addListener(this.__emmitChanges);
}

var global_storage = new Storage();


