/* To be isolated. */

function Cache (opt) {

	var self = this;

	if (!opt.feeding || !opt.birth)
		return null;
	
	this.feeding = opt.feeding;
	this.birth = opt.birth;
	
	this.key = opt.key || "generic_item";
	
	this.cache = [];
	
	this.removeCached = function (item_name) {
		
		self.cache.remove(
			self.cache.findIndex(
				cached => {
					return cached.name == item_name;
				}
			)
		);

		self.bg.option_mgr.sendMessage("cache-update-" + self.key, item_name);
	}

	/* item must exists in storage. */
	this.getOrBringCached = function (item_name) {

		var cached = self.cache.filter(
			cached => {
				return cached.name == item_name;
			}
		)[0];

		if (cached) 
			return Promise.resolve(cached);	
		else
			return self.getAndCacheItem(item_name);
	};

	this.getAndCacheItem = function (item_name) {

		return new Promise (
			(resolve, reject) => {
				
				self.feeding(
					item => {
						
						if (item) {

							self.cacheItem(item);
							
						} else {
							
							console.warn("Attempting to cache an unexistent item (" + item_name + ").");
							//reject(item_name);
						}

						resolve(item);
						
					}, item_name
				);
			}
		);
	};
	
	this.cacheItem = function (item) {

		var idx = self.cache.findIndex(
			cached => {
				
				return cached.name == item.name;
				
			}
		);

		if (idx >= 0)
			return idx;
		else
			return self.cache.push(item);
	};

	this.forceCacheItem = function (item) {

		var idx = self.cache.findIndex(
			cached => {
				
				return cached.name == item.name;
				
			}
		);

		if (idx >= 0)
			return self.cache[idx] = item;
		else
			return self.cache.push(item);

		self.bg.option_mgr.sendMessage("cache-update-" + self.key, item_name);
	};


	this.getCachedNames = function () {
		
		return self.cache.map(
			cached => {
				return cached.name;
			}
		); 
	};

	this.amICached = function (item_name) {

		return self.getCachedNames().includes(item_name);

	};
	
	this.getOrCreateItem = function (item_name, cache_new) {

		return new Promise (
			(resolve, reject) => {

				self.getOrBringCached(item_name)
					.then(item => {

						if (!item) {
							self.birth(
								item => {
									
									if (cache_new)
										self.cacheItem(item);
									
									item.cache = self;
									resolve(item);
									
								}, item_name);
						
						} else {

							if (!item.cache)
								item.cache = self;
							
							resolve(item);
						}
					});
			}
		);
	};
	
	/* Only when importing items, "cache-update-{ItemKey}" message will be broadcasted by "storeNew{ItemName}" on domain persist. */
	this.updateCache = function (item) {

		self.getOrBringCached(item.name)
			.then(
				cached => {
					
					if (cached)
						cached.mergeInfo(item); /* Groups missing */ 			
					else {
						
						self.cacheItem(item);
						item.persist();
					}
				}
			);
	};
}
