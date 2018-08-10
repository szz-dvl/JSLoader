function DataMgr (opt) {

	this.key = opt.key || "Generic";
	
	this.getItem = (item_name) => {
		
		return new Promise(
			(resolve, reject) => {
				this.storage["get" + this.key](
					item => {
						
						if (item)
							resolve(item);
						else
							reject(new Error("Attempting to fetch unexisting " + this.key.toLowerCase() + ": \"" + item_name + "\""));
						
					}, item_name);
			});
	}

	this.getOrCreateItem = (item_name) => {

		return new Promise(
			resolve => {
				this.storage["getOrCreate" + this.key](
					item => {
						
						resolve(item);
						
					}, item_name);
			});
	}

	this.removeItem = (item_name) => {

		return new Promise(
			(resolve, reject) => {
				
				this.getItem(item_name)
					.then(item => {
						
						item.remove()
							.then(resolve, reject);
						
					})		
			});
	}
	
	this.pushToDB = (names) => {

		let items = [];
		
		async.each(names,
			(items_name, next) => {
				
				this.storage["get" + this.key](
					item => {
						
						if (!item)
							next(new Error("Bad " + this.key + ": " + item_name));
						else {
							
							items.push(item);
							next();
						}
						
					}, items_name);	
				
			}, err => {

				if (err)
					console.error(err);
				else
					this.bg.database_mgr["push" + this.key + "s"](items);
			});
	};

	this.importData = (items) => {
		
		return new Promise(
			(resolve, reject) => {
				
				async.eachSeries(items,
					(item, next) => {
						
						this.getOrCreateItem(item.name)
							.then(
								fetched => {
									
									fetched.mergeInfo(item)
										.then(persisted => { next(); }, err => { next(); });
									
								}, reject);
						
					}, err => {
						
						if (err)
							reject(err);
						else
							resolve();
						
					});
			});
	};
	
	this.exportData = (inline) => {

		return new Promise(
			(resolve, reject) => {

				let text = ["["];
				
				async.each(this[this.key.toLowerCase() + "s"],
					(item_name, next) => {
						
						this.storage["get" + this.key](
							item => {

								if (item) {

									text.push(item.getJSON());
									text.push(",\n");

								}
								
								next();
								
							}, item_name);
						
					}, err => {

						if (err) 
							reject (err); 
						else {
							
							if (text.length > 1)
								text.pop(); //last comma
							
							text.push("]");
							
							if (inline)
								resolve(text);
							else
								resolve(browser.downloads.download({ url: URL.createObjectURL( new File(text, this.key.toLowerCase() + "s.json", {type: "application/json"}) ) }));
						}
						
					});
			});
	}

	this.exists = (name) => {

		return this[this.key.toLowerCase() + "s"].includes(name);
		
	}

	this.getMeaningful = (start, len) => {

		return new Promise((resolve, reject) => {

			let data = [];
			
			async.each(this[this.key.toLowerCase() + "s"],
				(item_name, next) => {
					
					this.getItem(item_name)
						.then(
							item => {
								
								if (item.haveData())
									data.push(item);

								next();
								
							}, err => {
								
								//console.warn(err);
								next();

							});
					
				}, err => {

					if (err)
						reject(err);
					else 
						resolve(data);
					
				})

		})
	}
	
	this.getSlice = (start, len) => {
		
		return new Promise(
			(resolve, reject) => {

				let items = [];

				this.getMeaningful().then(
					data => {

						resolve(
							{
								actual: start,
								total: data.length,
								data: data.sort(
									(a,b) => {
								
										return a.name > b.name;

									})
									.slice(start, start + len)
									.map(
										item => {

											return { name: item.name, scripts: item.getScriptCount(), sites: item.sites.length, in_storage: item.in_storage }
											
										}
									)
							}
						);
						
					}, reject
				);
			});
	}

	this.__getFirstFor = (target, name, index) => {
		
		let record = index.find(
			idx => {

				return idx.section == target && idx.list == name;

			}
		);

		return record ? record.first : 0;
		
	};

	this.getScriptsSliceFor = (start, len, target, site) => {

		console.log()
		return new Promise(
			(resolve, reject) => {
				
				this.getItem(target == 'Groups' ? site : target)
					.then(
						item => {

							let scripts = target == 'Groups' ?
													item.scripts :
													item.haveSite(site).scripts;
							
							resolve(
								{
									actual: start,
									total: scripts.length,
									data: scripts.sort(
										(a,b) => {
											
											return a.uuid > b.uuid;

										}).slice(start, start + len)
										
								}, reject
							);
						}, console.error);
			});
	}

	this.clear = () => {

		return new Promise((resolve, reject) => {
			
			async.each(this[this.key.toLowerCase() + "s"],
				(item_name, next) => {
					
					this.getItem(item_name)
						.then(
							item => {

								item.remove()
									.then(() => { next() }, () => { next() });
								
							}, err => {
								
								//console.warn(err);
								next();

							});
					
				}, err => {

					if (err)
						reject(err);
					else 
						resolve();
					
				})

		})
	}

	this.move2DB = (name) => {

		return new Promise((resolve, reject) => {
			
			this.getItem(name)
				.then(item => {
					
					item.remove()
						.then(removed => {

							removed.in_storage = false;
							
							removed.persist()
								.then(resolve,reject);
							
						})

				}, console.error);
		})
	}

	this.import2ST = (name) => {

		return new Promise((resolve, reject) => {
			
			this.getItem(name)
				.then(item => {

					/* Item will be in DB for sure */
					
					item.in_storage = true;
							
					item.persist()
						.then(resolve,reject);
				
				}, console.error);
		})
	}

	this.getStored = () => {

		return new Promise(
			(resolve, reject) => {
				browser.storage.local.get()
					.then(
						stored => {
							
							resolve(

								Object.keys(stored)
									.filter(key => {
										
										return key.split("-")[0] == this.key.toLowerCase();
											
									})
									.map(key => {
										
										return key.split("-").pop();
										
									})
							)
								
						}, reject)
			});
							
	}

	this.reIndex = () => {
		
		return new Promise (
			(resolve, reject) => {
				
				Promise.all([this.storage.db['get' + this.key + 's'](), this.getStored()])
					.then(resp => {
						
						this.storage["__set" + this.key + "s"](resp[0].concat(resp[1]).unique())
							.then(resolve, reject);
						
					}, reject);
			}
		)
	}
}
	
