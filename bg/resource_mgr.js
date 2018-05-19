function ResourceMgr (bg) {

	this.bg = bg;
	this.storage = global_storage;
	this.resources = []; /* Index */
	this.loaded = [];
	
	this.storage.__getResources(
		new_resources => {
			
			this.resources = new_resources;

			if (!this.resources.lenght) {

				new ResourceDir({
										
					name: "/"
					
				}).persist();
			}	
		}
	);

	this.findResource = (name) => {

		return new Promise(
			(resolve, reject) => {
				
				this.storage.getResource(
					resource => {

						if (resource) 
							resolve(resource);
						else {
							
							this.bg.database_mgr.getSync([name], 'resources')
								.then(arr => {
									
									resolve(arr.length ? arr[0] : null);
									
								}, reject);
							
						}
					
					}, name);
			}
		);
	};

	this.solveHierarchyFor = (name) => {

		return new Promise(
			(resolve, reject) => {

				let last = name.split("/").pop();
				let path = name.split("/").reverse().slice(1);
				path.push("/");
				
				async.eachSeries(path,
					(actual, next) => {
						
						this.findResource(actual)
							.then(resource_dir => {
								
								if (resource_dir) {
									
									if (resource_dir.appendItem(last)) {
										
										resource_dir.persist().then(next, next);
										
									} else {
										
										next(actual);
										
									}
							
								} else {
									
									let resource_dir = new ResourceDir({
										
										name: name.substring(0, name.indexOf(actual))
										
									});
									
									resource_dir.appendItem(last);
									resource_dir.persist().then(
										resource_dir => {
											
											next();
											
										}, next
									);
								}
							})
							
					}, err => {
						
						if (err instanceof Error) 
							reject(err);	
						else	
							resolve(err);
					}
				);
			});
	};
	
	this.storeResource = (name, type, file) => {
		
		return new Promise(
			(resolve, reject) => {

				let mgr = this;
				
				let reader = new FileReader();
				
				reader.onload = () => {
					
					new Resource ({
						
						name: name,
						type: type.includes('text') ? type : type.slice(0, -1) + file.name.split(".").pop(),
						file: type.includes('text') ? reader.result : reader.result.split(",").slice(1).join(),
						db: (file.size >= 1 * 1024 * 1024) ? mgr.bg.database_mgr : null,
						size: file.size
						
					}).persist().then(resolve, reject);
				}

				this.solveHierarchyFor(name)
					.then(
						last_created => {
							
							if (type.includes('text'))
								reader.readAsText(file);
							else
								reader.readAsDataURL(file);
						}
					);
			}
		);
	};
	
	this.removeResource = (name) => {

		return new Promise(
			(resolve, reject) => {

				let split = name.split("/");
				
				let leaf = split.pop();
				let parent = split.join("/");
				
				this.findResource(parent)
					.then(resource_dir => {

						let promise = resource_dir.removeItem(leaf) ? resource_dir.persist() : Promise.resolve();

						promise.then(
							parent_dir => {
								
								this.findResource(name)
									.then(resource => {

										if (resource)
											resource.remove().then(resolve, reject);
										else
											reject(new Error("Attempting to remove an unexisting resource: \"" + name + "\"."));
										
									});
							});
					});
			});
	};
	
	this.loadResource = (name) => {
		
		return new Promise(
			(resolve, reject) => {
				
				this.findResource(name)
					.then(resource => {
						
						if (resource) {
							
							let url = URL.createObjectURL ( resource.getAsBinary() );
							
							this.loaded.push({ name: resource.name, url: url });
							
							resolve(url);
							
						} else 	
							reject(new Error("Attempting to load missing resource: " + resource.name));
							
					}, reject);
			}
		)
	};

	this.unloadResource = (name) => {

		let url = null;
		
		let idx = this.loaded.findIndex(
			resource => {
				
				return resource.name == name;
				
			}
		);
		
		if (idx >= 0) {

			url = this.loaded[idx].url;
			URL.revokeObjectURL(url);
			this.loaded.remove(idx);
			
		} else {

			return Promise.reject(new Error("Attempting to unload unloaded resource: " + name));

		}
		
		return Promise.resolve(url);
	};
	
	this.renameResource = (oldn, newn) => {
		
		return new Promise(
			(resolve, reject) => {
				
				this.findResource(oldn)
					.then(resource => {
						
						if (resource) {
							
							resource.name = newn;
							
							resource.persist()
								.then(resolve, reject);

						} else 	
							reject(new Error("Attempting to rename unexisting resource: " + oldn));
							
					}, info.id);
			}
		)
	};

	this.__traverseVirtFS = (actual, result, first) => {
		
		return new Promise(
			(resolve, reject) => {
				
				this.findResource(actual)
					.then(
						resource => {
							
							if (resource.dir) {

								let paths = 0;
								
								async.eachSeries(resource.items,
									(name, next) => {
										
										this.findResource(resource.name + "/" + name)
											.then(
												resource => {
													
													if (resource.dir) {
														
														result[actual].items.push({
															
															name: resource.name,
															items: []
														});

														paths ++;
														
														this.__traverseVirtFS(resource.name, result, false)
															.then(resolve, next);
														
													} else {
														
														result[actual].items.push(resource);
														
													}
														
													next();
														
												});

									}, err => {

										if (err)
											reject(err);
										else {
											
											if (first) {

												this.currentTraverse = 0; /*?*/
												
												if (paths) {

													this.currentTraverse = paths;
													reject();
													
												} else
													resolve(result);

											} else {

												if (! --this.currentTraverse)
													resolve(result);
												else
													reject();
											}
										}
									});
								
							} else {

								/* Only if requested path is a leaf resource. */

								resolve(resource);
								
							} 
						}
					);
			}
		);			
	};

	this.traverseVirtFS = (from) => {
		
		return this.__traverseVirtFS(from, { name: from, items: [] }, true);

	}

	this.projectOpPageDir = (obj) => {
		
		obj.items = obj.items.map(
			resource => {
				
				return resource.dir ? this.projectOpPageDir(resource) : { name: resource.name, type: resource.type, size: resource.getSizeString(), db: resource.db ? true : false };

			}
		);

		return obj;
	};
	
	this.getVirtFS = () => {

		return new Promise(
			(resolve, reject) => {
				
				this.traverseVirtFS("/").then(
					result => {
					
						if (result instanceof Resource)
							resolve(result);
						else 
							resolve(this.projectOpPageDir(result));
					}
				);
				
			}
		) 
	}
	
	this.editTextResource = (resource) => {

		if (this.bg.editor_mgr.resourceEditing(resource))
			return Promise.resolve();
		else {
			
			if (!resource.size) {
				
				return this.bg.editor_mgr.openEditorInstanceForScript(
					
					new Script({
						
						parent: new Resource({
							
							name: resource.name,
							type: resource.type
							
						}),
						
						code: " "
					})
				);
			
			} else {
				
				return new Promise(
					(resolve, reject) => {
						
						this.findResource(resource.name)
							.then(item => {
								
								if (item) {
									
									resolve(
										
										this.bg.editor_mgr.openEditorInstanceForScript(
											
											new Script({
												
												parent: resource,
												code: resource.file
											})
										)	
									);
									
								} else 	
									reject(new Error("Missing persisted resource: " + resource.name));
								
							}, reject);
					});
			}
		}
	};
	
	this.storeNewResources = (changes, area) => {
		
		if (area != "local")
	 		return;
		
		for (key of Object.keys(changes)) {
			
			if (key == "resources") 
				this.resources = changes.resources.newValue || [];			
		}
	};
	
	browser.storage.onChanged.addListener(this.storeNewResources);
} 
