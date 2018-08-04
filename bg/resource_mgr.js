function ResourceMgr (bg) {

	this.bg = bg;
	this.storage = global_storage;
	this.resources = []; /* Index */
	this.loaded = [];

	this.MAX_STORAGE_SIZE = 1 * 1024 * 1024;
	
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
	
	/* When clearing storage, be aware of other extensions! */
	this.recreateRoot = () => {

		return new Promise(
			(resolve, reject) => {
				
				this.storage.getResource(
					root => {
						
						if (!root) {
							
							new ResourceDir({
								
								name: "/"
								
							}).persist().then(storage => { resolve("/"); }, reject);
						}	
			
					}, "/"
				);
			});
	};
	
	this.findResource = (name) => {

		return new Promise(
			(resolve, reject) => {
				
				this.storage.getResource(
					resource => {

						if (resource) 
							resolve(resource);
						else {

							if (this.bg.database_mgr.connected) {
								
								this.bg.database_mgr.getSync([name], 'resources')
									.then(arr => {
										
										resolve(arr.length ? arr[0] : null);
										
									}, reject);

							} else {

								resolve(null);
							}
						}
					
					}, name);
			}
		);
	};


	this.solveHierarchyForEditor = (resource, newn) => {

		return new Promise(
			(resolve, reject) => {

				let rname = newn;
				let oldn = resource.name;
				let ext = rname.split(".").pop();
				
				this.findResource(this.__getParentFor(rname))
					.then(parent => {
						
						if (parent) {
							
							let siblings = parent.items;

							if (siblings.includes(oldn)) {
								
								siblings.remove(siblings.indexOf(oldn));
								
								let cnt = 1;
							
								while (siblings.includes(rname)) {
								
									rname = newn.split(".").slice(0, -1).join(".") + cnt.toString() + "." + ext;
									cnt ++;
								}
								
								if (oldn == rname) {

									this.solveHierarchyFor(rname)
										.then(resolve, reject);
								
								} else {

									this.renameResource(oldn, rname)
										.then(updated => {
										
											this.solveHierarchyFor(updated.name)
												.then(last => { resolve(updated) }, reject);

										});
								}

							} else { /* Assume unexistent resource. */
								
								/* New Resources */

								let cnt = 1;
								
								while (siblings.includes(rname)) {
									
									rname = newn.split(".").slice(0, -1).join(".") + cnt.toString() + "." + ext;
									cnt ++;
								}

								resource.name = rname;
								
								this.solveHierarchyFor(rname)
									.then(resolve, reject);
							}
							
						} else {

							this.solveHierarchyFor(rname)
								.then(resolve, reject);
							
						}
						
					});
			}
		);
	};

	this.solveHierarchyFor = (name) => {

		return new Promise(
			(resolve, reject) => {
				
				this.findResource(this.__getParentFor(name))
					.then(parent => {

						if (parent) {

							parent.appendItem(name);
							parent.persist().then(dir => { resolve(name) }, reject);

						} else {

							let dir = new ResourceDir({
										
								name: this.__getParentFor(name)
										
							});

							dir.appendItem(name);
							dir.persist().then(resource => { this.solveHierarchyFor(this.__getParentFor(name)).then(resolve, reject) }, reject);
						}
						
					}, reject);
				
			}
		)
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
						db: (file.size >= this.MAX_STORAGE_SIZE) ? mgr.bg.database_mgr : null,
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

		console.log("Removing hierarchy for: " + empty.name);
		
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
	
	this.importAsResource = (url, force, name) => {
		
		return new Promise (
			(resolve, reject) => {

				try {

					let myurl = new URL(url);
					
					fetch(url)
						.then(
							response => {
								
								let actual_name = name || '/imported/' + url.split("/").pop().split('?')[0];
								let type = response.headers.get('content-type').split(';')[0];

								if (type) {
									
									if (type.includes('javascript'))
										type = 'text/javascript';													
									
									let split = actual_name.split(".");
									let expected = type.split("/").pop() != 'javascript' ? new RegExp(/[a-z]+/).exec(type.split("/").pop())[0] : 'js' ;
									let received = split.slice(-1).join();
									
									if (expected != received) 
										actual_name = split.slice(0, -1).join('.') ? split.slice(0, -1).join('.') + "." + expected : actual_name + '.' + expected;

									this.findResource(this.__getParentFor(actual_name))
										.then(
											parent => {

												let ok = true;
												
												if (parent) {

													if (force) {

														let cnt = 1;
														let backup = actual_name;
														
														while (parent.items.includes(actual_name)) {
														
															actual_name = backup.split(".").slice(0, -1).join(".") + cnt.toString() + "." + expected;
															cnt ++;
														}
														
													} else {
														
														if (parent.items.includes(actual_name))
															ok = false;
													}
												}

												let promise = ok ?
															  (type.includes('text') ? response.text() : response.arrayBuffer()) :
															  Promise.reject(new Error('Overwriting existing resource: ' + actual_name));
												
												promise.then(data => {
													
													/* @: https://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string */
													
													let content = type.includes('text') ? data : btoa(String.fromCharCode(...new Uint8Array(data)));
													let size = content.length * 2; /* Not actually accurate ... */
													
													this.solveHierarchyFor(actual_name)
														.then(
															last_created => {

																let mgr = this;
																
																new Resource ({
																	
																	name: actual_name,
																	type: type,
																	file: content,
																	db: (size >= this.MAX_STORAGE_SIZE) ? mgr.bg.database_mgr : null,
																	size: size
																	
																}).persist().then(resolve, reject);
																
															}, reject
														);
													
												}, reject);

											}, reject);
									
								} else {

									reject(new Error('Bad content type.'));

								}
								
							}, reject);

				} catch(err) {

					reject(err);
					
				}
			});
	};
	
	this.loadResource = (name) => {
		
		return new Promise(
			(resolve, reject) => {

				let urls = [];
				
				this.findResource(name)
					.then(resource => {
						
						if (resource) {

							if (resource.dir) {

								async.each(resource.items,
									(item, next) => {

										this.loadResource(item)
											.then(loaded => {

												if (loaded instanceof Array) 
													urls.push.apply(urls, loaded);
												else
													urls.push(loaded);

												next();
												
											}, err => {

												next();

											})

									}, err => {

										resolve(urls);
										
									}
								)
									
							} else {

								let loaded = this.loaded.find(
									resource => {
										
										return resource.name == name;
				
									}
								);

								if (loaded)
									resolve(loaded);
								else {

									let res = { name: resource.name, url: resource.load() };
							
									this.loaded.push(res);
									
									resolve(res);
								}
							}
							
						} else {
							
							reject(new Error("Attempting to load missing resource: " + name));
							
						}
							
					}, reject);
			}
		)
	};
	
	this.unloadResource = (name) => {
		
		if (name.slice(-1) == "/") {
			
			let idx = this.loaded.findIndex(
				resource => {
					
					return resource.name.startsWith(name);
				
				}
			);
			
			while (idx >= 0) {
				
				URL.revokeObjectURL(this.loaded[idx].url);

				this.loaded.remove(idx);
				
				idx = this.loaded.findIndex(
					resource => {
						
						return resource.name.startsWith(name);
						
					}
				);
			}

		} else {

			let idx = this.loaded.findIndex(
				resource => {
					
					return resource.name == name;
				
				}
			);
		
			if (idx >= 0) {

				URL.revokeObjectURL(this.loaded[idx].url);
				this.loaded.remove(idx);
				
			}
		}	
	};

	this.viewResource = (name) =>{

		return new Promise(
			(resolve, reject) => {
				
				this.findResource(name)
					.then(resource => {

						if (resource) {

							let url = resource.load();
							
							/* To check: getCurrent() when editor is opened (filtering types) ===> null? */
							
							browser.windows.getAll({ populate: false, windowTypes: ['normal', 'panel'] })
								.then(wdws => {
									browser.tabs.create({ active: true, url: resource.load(), windowId: wdws[0].id })
										.then(tab => {

											URL.revokeObjectURL(url);

										}, reject);
									
								}, reject);
							
						} else {
							
							reject(new Error("Trying to view unexisting resource: " + name));

						}
						
					});
			});
	};
	
	this.renameResource = (oldn, newn) => {
		
		return new Promise(
			(resolve, reject) => {

				this.solveHierarchyFor(newn)
					.then(solved => {
						
						Promise.all([this.findResource(oldn), this.findResource(this.__getParentFor(oldn))])
							.then(arr => {

								let resource = arr[0];
								let old_parent = arr[1];
								
								if (resource) {
									
									resource.remove().then(
										removed => {
											
											resource.name = newn;
											
											old_parent.items.remove(
												old_parent.items.findIndex(
													name => {
														
														return name == oldn;
													}
												)
											);

														
											let promises = [];
											
											if (!old_parent.items.length && old_parent.name != "/")
												promises.push(this.removeHierarchyFor(old_parent));
											else
												promises.push(old_parent.persist());

											promises.push(resource.persist());
											
											Promise.all(promises)
												.then(ok => { resolve(resource) }, reject);
											
												
										});

								} else {

									reject(resource);
									
								}
								
							}, reject);
						
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

							resource.db = (file.size >= this.MAX_STORAGE_SIZE) ? mgr.bg.database_mgr : null;
							
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
				
				return resource.items ? this.__projectOpPageDir(resource) : { name: resource.name, type: resource.type, size: resource.getSizeString(), shown: true };

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
		
		if (this.bg.editor_mgr.resourceEditing(resource)) {

			/* Focus editor. */
			
			return Promise.resolve();

		} else {
			
			if (!resource.type) {

				/* New Resource */
				
				return this.bg.editor_mgr.openEditorInstanceForScript(
					
					new Script({
						
						parent: new Resource({
							
							name: resource.name,
							type: 'text/javascript'
							
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
