function DataMgr (opt) {

	this.key = opt.key || "Generic";
	
	this.removeItem = (item_name) => {

		return new Promise(
			resolve => {
				this.storage["get" + this.key](
					item => {
						
						resolve(item.remove());
						
					}, item_name);
			});
	}

	this.getItem = (item_name) => {

		return new Promise(
			resolve => {
				this.storage["get" + this.key](
					item => {
						
						resolve(item);
						
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
									text.push(",");

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

}
