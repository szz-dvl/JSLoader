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
	
	/* item must exists in storage. ~ And ~ */
	this.getOrBringCached = function (item_name) {
		
		let cached = self.cache.find(
			cached => {
				return cached.name == item_name;
			}
		) || null;

		if (cached) {
			
			cached.cache = self;
			return Promise.resolve(cached);	
			
		} else
			return self.getAndCacheItem(item_name);
	};

	this.__getAndCacheItem = function (item_name, ret) {

		return new Promise (
			(resolve, reject) => {
				
				self.feeding(
					item => {
						
						if (item) {

							item.cache = self;
							
							if (item.haveData())
								self.cacheItem(item);
							else
								console.warn("Rejecting void item: " + item_name);
							
						} else {
							
							console.warn("Attempting to cache an unexistent item (" + item_name + ").");
							//reject(item_name);
						}
						
						resolve(ret ? item : void 0);
						
					}, item_name
				);
			}
		);
	};

	this.getAndCacheItem = function (item_name) {

		return self.__getAndCacheItem(item_name, true);

	};

	this.bringItem = function (item_name) {
		
		return self.__getAndCacheItem(item_name, false);

	};
	
	this.__cacheItem = function (item, force) {

		item.cache = self;
		
		var idx = self.cache.findIndex(
			cached => {
				
				return cached.name == item.name;
				
			}
		);

		if (force && idx >= 0)
			self.cache[idx] = item;

		return idx >= 0 ? idx : self.cache.push(item);
	};

	this.cacheItem = function (item) {

		return self.__cacheItem(item, false);
	};

	this.forceCacheItem = function (item) {

		self.bg.option_mgr.sendMessage("cache-update-" + self.key, item.name);
		
		return self.__cacheItem(item, true);
		
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

							item.cache = self;
							resolve(item);
						}
					});
			}
		);
	};

	this.getMissingItems = function () {

		return new Promise (
			(resolve, reject) => {
				
				var missing = _.difference(self[self.key], self.getCachedNames());
				
				async.each(missing,
						   (item_name, next) => {
							   
							   self.bringItem(item_name)
								   .then(next, next);
							   
						   },
						   err => {

							   if (err) {
								   
								   console.error("Error getting missing items for " + self.key);
								   reject(err);
								   
							   } else
								   resolve(self.cache);
							   
						   });
			});
	}

	this.reload = function () {

		//console.log(self.getCachedNames());

		return new Promise (
			(resolve, reject) => {

				let names = self.getCachedNames();
				self.cache = [];
				
				async.each(names,
						   (item_name, next) => {
							   
							   self.bringItem(item_name)
								   .then(next, next);
							   
						   },
						   err => {
							   
							   if (err) {
								   
								   console.error("Error reloading items for " + self.key);
								   reject(err);
								   
							   } else
								   resolve(self.cache);
							   
						   });
			}
		);
	}

	this.getAllItems = function () {

		return new Promise(
			(resolve, reject) => {
				
				self.reload()
					.then(
						cache => {
							
							self.getMissingItems()
								.then(resolve,reject);
							
						}, reject);
			}
		)
	}

	/* Here for convenience */
	this.getInfoFor = function (names) {

		return new Promise (
			(resolve, reject) => {

				let info = [];
				
				async.each(names,
						   (name, next) => {

							   self.getOrBringCached(name)
								   .then(
									   item => {

										   if (item) {
											   
											   /* Must allways exist*/
											   info.push({name: name, scripts: item.scripts});
											   next();
											   
										   } else
											   next(new Error("Missing item."));
									   }
								   );
					   
						   },
						   err => {

							   if (err)
								   reject(err);
							   else
								   resolve(info);

						   });
			});
	};
	
	/* Only when importing items, "cache-update-{ItemKey}" message will be broadcasted by "storeNew{ItemName}" on domain persist. !!!! */
	this.updateCache = function (item) {

		return new Promise(
			(resolve, reject) => {
				
				self.feeding(
					fed_item => {
						
						if (fed_item) {
							
							fed_item.mergeInfo(item);								
							self.forceCacheItem(fed_item);
							fed_item.cache = self;
							
							resolve(fed_item);
							
						} else {
							
							self.birth(
								new_item => {	
									
									new_item.mergeInfo(item);								
									self.cacheItem(new_item);
									new_item.cache = self;
									
									resolve(new_item);
									
								}, item.name);
						}
						
					}, item.name);
			});
	};
}
