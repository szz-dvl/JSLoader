function ResourceMgr (bg) {

	this.bg = bg;
	this.storage = global_storage;
	this.resources = []; /* Index */
	this.loaded = [];
	
	this.storage.__getResources(
		new_resources => {

			if (new_resources.length)
				this.resources = new_resources;
			else {

				new ResourceDir({
					
					name: "/"
					
				}).persist();
			}	
		}
	);

	this.__getParentFor = (name) => {

		let slice = name.slice(-1) == "/" ? -2 : -1;
		return name.split("/").slice(0, slice).join("/") + "/";

	};
	
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
				
				let split = name.split("/");
				let last = name;

				split.pop();
				
				let path = []
				
				while (split.length) {
					
					path.push(split.join("/") + "/");
					split.pop();
				}
				
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

									last = actual;
									
								} else {
									
									let dir = new ResourceDir({
										
										name: actual
										
									});
									
									dir.appendItem(last);
									
									last = actual;
								
									dir.persist().then(
										dirp => {
											
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
	
	this.__removeResource = (name) => {
		
		return new Promise(
			(resolve, reject) => {				
				
				this.findResource(name)
					.then(resource => {
						
						if (resource) {
							
							if (resource.dir) {
								
								resource.remove().then(
									removed => {
										
										async.eachSeries(removed.items,
											(resource_name, next) => {

												/* No need to destroy parent index, every underlying item will be removed. */
												
												this.__removeResource(resource_name)
													.then(next, next);
												
											}, err => {

												resolve();
												
											});

									});

							} else {

								resource.remove().then(() =>  { resolve(); }, () =>  { reject(); });
							}
							
						} else {

							console.error(new Error("Attempting to remove an unexisting resource: \"" + name + "\"."));
							reject();
						}
						
					});
			});
	};

	this.removeResource = (name) => {

		return new Promise(
			(resolve, reject) => {
				
				this.findResource(this.__getParentFor(name))
					.then(resource_dir => {

						/* Void directories may be persisted here, however views must take care of solving the hierarchy as necessary. */
						
						let promise = resource_dir.removeItem(name) ? resource_dir.persist() : Promise.resolve(null);
						
						promise.then(
							parent => {

								if (parent) {

									this.__removeResource(name)
										.then(resolve, reject);

								} else {

									/* Empty unpersisted directory removed by user. */
									resolve();

								}
								
							}
						);
						
					});
			});
	}
	
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

				Promise.all([this.findResource(oldn), this.findResource(this.__getParentFor(oldn))])
					.then(arr => {

						let resource = arr[0];
						let parent = arr[1];

						resource.name = newn;
						parent.items[

							parent.items.findIndex(
								name => {
									
									return name == oldn;
								}
							)
								
						] = newn;

						Promise.all([parent.persist(), resource.persist()])
							.then(resolve, reject);
						
					}, reject);
			}
		)
	};

	this.__traverseVirtFS = (actual, bucket, result, paths) => {
		
		return new Promise(
			(resolve, reject) => {
				
				this.findResource(actual)
					.then(
						resource => {

							if (resource.dir) {
								
								let dirs = resource.items.filter(name => { return name.slice(-1) == "/" });
								let files = resource.items.filter(name => { return name.slice(-1) != "/" });

								paths += dirs.length;
								
								async.eachSeries(files,
									(name, next) => {

										this.findResource(name)
											.then(
												child_resource => {

													if (child_resource) {
														
														bucket.items.push(child_resource);
														
													} else {

														console.warn("Missing resource: " + name);
														
													}

													next();
												}
											);
											
									}, err => {

										if (!err) {			

											async.eachSeries(dirs, (name, next) => {
												
												this.findResource(name)
													.then(
														child_resource => {
															
															if (child_resource) {
																
																let idx = bucket.items.push({
																	
																		name: child_resource.name,
																	items: []
																	
																}) - 1;
																
																this.__traverseVirtFS(child_resource.name, bucket.items[idx], result, -- paths)
																	.then(resolve, next);
																
															} else {
																
																console.warn("Missing resource: " + name);
																next();
															}
															
														});
											}, err => {

												if (!paths && !dirs.length)
													resolve(result);
												else
													reject();
											});
											
										} else {
											
											/* ?? */
											reject();
										}
									}
								);
								
							} else {
								
								/* Only if requested path is a file resource. */
								
								resolve(resource);
								
							} 
						}
					);
			}
		);			
	};

	this.traverseVirtFS = (from) => {

		let result = { name: from, items: [] };
		
		return this.__traverseVirtFS(from, result, result, 0);

	}

	this.__projectOpPageDir = (obj) => {
		
		obj.items = obj.items.map(
			resource => {
				
				return resource.items ? this.__projectOpPageDir(resource) : { name: resource.name, type: resource.type, size: resource.getSizeString(), db: resource.db ? true : false };

			}
		);

		return obj;
	};
	
	this.getVirtFS = () => {

		return new Promise(
			(resolve, reject) => {
				
				this.traverseVirtFS("/").then(
					result => {

						console.log(result);
						
						if (result instanceof Resource)
							resolve(result);
						else 
							resolve(this.__projectOpPageDir(result));
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
