function DataMgr (opt) {

	this.key = opt.key || "Generic";
	
	this.removeItem = (item_name) => {

		/* to be refactored */
		
		return new Promise(
			resolve => {
				this.storage["get" + this.key](
					item => {
						
						if (item) {
							
							item.remove()
								.then(
									removed => {

										switch(this.key) {

											case 'Domain':

												{	
													let sites = removed.sites.concat(removed);
													
													async.eachSeries(sites,
														(site, next_site) => {
															
															async.each(site.groups,
																(group_name, next_group) => {
																	
																	this.storage.getGroup(
																		group => {
																			
																			if (group) {
																				
																				group.removeSite(site);
																				site.removeGroup(group);
																				
																				group.persist().then(() => { next_group() }, next_group);
																				
																			} else {

																				console.warn('missing group: ' + group_name);
																				next_group();
																			}
																			
																		}, group_name
																	);
																	
																}, err => {

																	if (err)
																		reject(err);
																	else
																		next_site();
																}
															);
															
														}, err => {
															
															if (err)
																reject(err);
															else
																resolve(removed);
														}
													);
												}
												
												break;
												
											case 'Group':

												{
													async.each(removed.sites,
														(site_name, next_site) => {
															
															let hostname = site_name.split("/")[0];
															let pathname = "/" + site_name.split("/").slice(1).join("/");
															
															this.storage.getDomain(
																domain => {
																	
																	if (domain) {
																		
																		let site = domain.haveSite(pathname);
																		
																		if (site) {
																			
																			site.removeGroup(removed);
																			removed.removeSite(site);
																		}
																		
																		site.persist().then(() => { next_site() }, next_site);

																	} else {

																		console.warn("missing site: " + site_name);
																		next_site();
																	}
																	
																}, hostname
															);
															
														}, err => {
															
															if (err)
																reject(err);
															else
																resolve(removed);
														}
													);
												}
												
												break;

											default:
												break;
										}
									}
								);
						
						} else
							reject(new Error("Attempting to remove unexisting " + this.key.toLowerCase()  + ": \"" + item_name + "\""));
						
					}, item_name);
			});
	}

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

	this.getMeaningfull = (start, len) => {

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
								
								console.warn(err);
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

				this.getMeaningfull().then(
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

											return { name: item.name, scripts: item.getScriptCount(), sites: item.sites.length }
											
										}
									)
							}
						);
						
					}, reject
				);
			});
	}

	this.getScriptsSliceFor = (start, len, target, site) => {
		
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
						});
			});
	}	
}
	
