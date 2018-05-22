function ResourceMgr (bg) {

	this.bg = bg;
	this.storage = global_storage;
	this.resources = []; /* Index */
	this.loaded = [];
	
	this.storage.getResource(
		root => {

			if (!root) {
				
				new ResourceDir({
					
					name: "/"
					
				}).persist();
			}	
			
		}, "/"
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
	
	this.storeResource = (name, file) => {
		
		return new Promise(
			(resolve, reject) => {

				let mgr = this;
				
				let reader = new FileReader();
				
				let is_text = ['javascript', 'html', 'json', 'css']
					.find(
						kw => {
										
							return file.type.includes(kw);
						}
					);

				let type = is_text ? 'text/' + is_text : file.type;
				
				reader.onload = () => {
					
					new Resource ({
						
						name: name,
						type: type,
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
	
	this.removeHierarchyFor = (empty) => {
		
		return new Promise(
			(resolve, reject) => {
				
				empty.remove().then(
					removed => {
						
						this.findResource(this.__getParentFor(removed.name))
							.then(parent => {
								
								parent.removeItem(removed.name);
								
								if (parent.items.length || parent.name == "/") 	
									parent.persist().then(resolve, reject);
								else 
									this.removeHierarchyFor(parent).then(resolve, reject);
								
							});
					});
			});
	};
	
	this.removeResource = (name, noview) => {

		return new Promise(
			(resolve, reject) => {
				
				this.findResource(this.__getParentFor(name))
					.then(resource_dir => {

						/* Void directories may be persisted here, however views must take care of solving the hierarchy as necessary (Unless "noview" argument is present). */
						
						let promise = resource_dir.removeItem(name) ? resource_dir.persist() : Promise.resolve(null);
						
						promise.then(
							parent => {

								if (parent) {

									if (noview && !parent.items.length) {
										
										this.removeHierarchyFor(parent).then(
											solved => {
												
												this.__removeResource(name)
													.then(resolve, reject);
											}
										)
											
									} else {
										
										this.__removeResource(name)
											.then(resolve, reject);
										
									}

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
							.then(ok => { resolve(newn) }, reject);
						
					}, reject);
			}
		)
	};

	this.resourceUpdate = (name, file) => {
		
		return new Promise(
			(resolve, reject) => {

				this.findResource(name)
					.then(resource => {

						if (resource && !resource.dir) {

							resource.db = (file.size >= 1 * 1024 * 1024) ? mgr.bg.database_mgr : null;
							
							resource.updateFileContent(file)
								.then(file => {
									
									resource.persist()
										.then(resolve, this.bg.notify_mgr.error);
									
								});
							
						} else {

							reject(new Error("Updating bad resource: " + name));
							
						}
						
					}, reject);
			}
		);
	};

	this.__traverseVirtFS = (actual, bucket) => {
		
		return new Promise(
			(resolve, reject) => {
				
				this.findResource(actual)
					.then(
						resource => {

							if (resource) {
								
								if (resource.dir) {

									async.eachSeries(resource.items,
										(name, next) => {
											
											this.findResource(name)
												.then(
													child_resource => {
														
														if (child_resource) {

															if (child_resource.dir) {
																
																this.__traverseVirtFS(child_resource.name, {
																	
																	name: child_resource.name,
																	items: []
																	
																}).then(partial => {
																	
																	bucket.items.push(partial);
																	next();

																}, next);
																
															} else {
																
																bucket.items.push(child_resource);
																next();
															}
															
														} else {
															
															console.warn("Missing resource: " + name);
															next();
														}
														
													})
												
										}, err => {

											resolve(bucket);
											
										});
									
									
								} else {
									
									/* Only if requested path is a file resource. */
									
									resolve(resource);
									
								}

							} else {

								/* Only if requested path don't exists. */
								
								resolve(null);
								
							}
						}
					);
			}
		);			
	};

	this.traverseVirtFS = (from) => {
		
		return this.__traverseVirtFS(from, { name: from, items: [] });
	}

	this.__projectOpPageDir = (obj) => {
		
		obj.items = obj.items.map(
			resource => {
				
				return resource.items ? this.__projectOpPageDir(resource) : { name: resource.name, type: resource.type, size: resource.getSizeString(), db: resource.db ? true : false };

			}
		);

		return obj;
	};
	
	this.getVirtFS = (from) => {

		return new Promise(
			(resolve, reject) => {
				
				this.traverseVirtFS(from).then(
					result => {

						if (result) {

							if (result instanceof Resource)
								resolve({ name: result.name, type: result.type, size: result.getSizeString(), db: result.db ? true : false });
							else 
								resolve(this.__projectOpPageDir(result));

						} else {

							reject(from);
							
						}
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
												
												parent: item,
												code: item.file
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
} 
