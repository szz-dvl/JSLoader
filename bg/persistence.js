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
			
		}, onError);
		
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
		
		browser.storage.local.remove(key)
			.then(null, onError);
	};

	this.__getDomains = function (cb) {
		
		this.__get(arr => {

			cb(arr || []);

		}, 'domains');

	};

	this.__setDomains = function (val) {
		
		return this.__set('domains', val);
	};

	this.__upsertDomain = function (name, val) {
		
		return this.__set('domain-' + name, val);
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

		this.getDomain (
			domain => {

				if (Object.keys(domain).length) {	
				
					cb(domain);
				
				} else {
					
					cb(new Domain( {name: name} ) );
				}
				
			}, name);
		
	};

	this.getOptions = function (cb) {
		
		self.__get(cb, 'options');
		
	};

	this.setOptions = function (val) {

		return self.__set('options', val);
	};
}

var global_storage = new Storage();


