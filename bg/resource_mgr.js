function ResourceMgr (bg) {

	this.bg = bg;
	this.storage = global_storage;
	this.resources = []; /* Index */
	this.loaded = [];
	
	this.storage.__getResources(
		new_resources => {
			
			this.resources = new_resources;
			
		},
	);
	
	this.storeResource = (name, type, ext, file) => {

		let opt = {

			name: name,
			file: file
		};

		switch (type) {
			case "css":
			case "javascript":
			case "html":
				{
					opt.type = "text/" + type;
				}
				break;
			case "image":
				{
					opt.type = "image/" + ext;
				}
				break;
			case "video":
				{
					opt.type = "video/" + ext;
				}
				break;
			case "audio":
				{
					opt.type = "audio/" + ext;
				}
				break;
				
			default:
				break;
		}
		
		return new Resource(opt).persist();
	};
	
	this.removeResource = (id) => {
		
		return this.storage.removeResource(id);

	};
	
	this.loadResource = (id) => {
		
		return new Promise(
			(resolve, reject) => {
				
				this.storage.getResource(
					resource => {

						if (resource) {
		
							let url = URL.createObjectURL ( resource.getAsBinary() );
							
							this.loaded.push({ id: resource.id, url: url });
							
							resolve(url);
							
						} else {
							
							console.warn("Missing resource: " + resource.id);
							reject();
						}
						
					}, id);
			}
		)
	};

	this.unloadResource = (id) => {

		var url;
		
		let idx = this.loaded.findIndex(
			resource => {
				
				return resource.id == id;
				
			}
		);
		
		if (idx >= 0) {

			url = this.loaded[idx].url;
			
			URL.revokeObjectURL(this.loaded[idx].url);
			this.loaded.remove(idx);
			
		} else {
			
			console.warn("Attempting to unload unloaded resource: " + id);
			url = null;
			
		}

		return Promise.resolve(url);
	};
	
	this.persistNameFor = (info) => {
		
		return new Promise(
			(resolve, reject) => {
				
				this.storage.getResource(
					resource => {
						
						if (resource) {
							
							resource.name = info.name;
							
							resource.persist()
								.then(resolve, reject);

						} else {
							
							reject();
							
						}
						
					}, info.id);
			}
		)
	};
	
	this.isLoaded = (id) => {
		
		return this.loaded.find(
			resource => {
				
				return resource.id == id;
			}
			
		) ? true : false;
	};

	this.getResourcesRelation = () => {
		
		return new Promise(
			(resolve, reject) => {

				let relation = [];
				
				async.each(this.resources,
					(resource_name, next) => {
						
						this.storage.getResource(
							resource => {
								
								if (resource)
									relation.push({ name: resource.name, type: resource.type, id: resource.id });
								
								next();
								
							}, resource_name);
				
					}, err => {
						
						if (err)
							reject(err);
						else
							resolve(relation);
					});
			});
	};

	this.editTextResource = (resource) => {

		if (this.bg.editor_mgr.resourceEditing(resource))
			return Promise.resolve();

		else {
			
			if (!resource.id) {
				
				return this.bg.editor_mgr.openEditorInstanceForScript(
					
					new Script({
						
						parent: new Resource({
							
							name: resource.name,
							type: "text/" + resource.type
							
						}),
						
						code: " "
					})
				);
			
			} else {
				
				return new Promise(
					(resolve, reject) => {

						this.storage.getResource(
							resource => {
								
								if (resource) {

									resource.readTextContent()
										.then(
											text => {
												
												resolve(
													
													this.bg.editor_mgr.openEditorInstanceForScript(
											
														new Script({
											
															parent: resource,
															code: text
														})
													)	
												);
											});
								} else {
									
									console.warn("Missing persisted resource.");
									reject();
								}
								
								
							}, resource.id)
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
