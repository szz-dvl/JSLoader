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
	
	this.storeResource = (name, type, file) => {

		console.log(file);
		//return new Resource(opt).persist();
		
	};
	
	this.removeResource = (name) => {
		
		return this.storage.removeResource(name);

	};
	
	this.loadResource = (name) => {
		
		return new Promise(
			(resolve, reject) => {
				
				this.storage.getResource(
					resource => {
						
						let url = URL.createObjectURL ( resource.file );
						
						this.loaded.push({ name: resource.name, url: url });
						
						resolve(url);
						
					}, name);
			}
		)
	};

	this.unloadResource = (name) => {

		var url;
		
		let idx = this.loaded.findIndex(
			resource => {
				
				return resource.name == name;
				
			}
		);
		
		if (idx >= 0) {

			url = this.loaded[idx].url;
			
			URL.revokeObjectURL(this.loaded[idx].url);
			this.loaded.remove(idx);
			
		} else {
			
			console.warn("Attempting to unload unloaded resource: " + name);
			url = null;
			
		}

		return Promise.resolve(url);
	};
	
	this.isLoaded = (name) => {
		
		return this.loaded.find(
			resource => {
				
				return resource.name == name;
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
									relation.push({ name: resource.name, type: resource.type, persisted: true });

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

		this.bg.editor_mgr.openEditorInstanceForScript(
			new Script({

				parent: new Resource({

					name: resource.name,
					type: "application/javascript"
					
				}),
				
				code: " "
			})
		);
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
