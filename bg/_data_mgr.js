function DataMgr (opt) {

	let self = this;
	this.key = opt.key || "Generic";
	
	this.removeItem = function (item_name) {

		return new Promise(
			resolve => {
				self.storage["get" + self.key](
					item => {
						
						resolve(item.remove());
						
					}, item_name);
			});
	}

	this.getItem = function (item_name) {

		return new Promise(
			resolve => {
				self.storage["get" + self.key](
					item => {
						
						resolve(item);
						
					}, item_name);
			});
	}

	this.getOrCreateItem = function (item_name) {

		return new Promise(
			resolve => {
				self.storage["getOrCreate" + self.key](
					item => {
						
						resolve(item);
						
					}, item_name);
			});
	}

	this.pushToDB = function (names) {

		let items = [];
		
		async.each(names,
			(items_name, next) => {
				
				self.storage["get" + self.key](
					item => {
						
						if (!item)
							next(new Error("Bad " + self.key + ": " + item_name));
						else {
							
							item.push(item);
							next();
						}
						
					}, items_name);	
				
			}, err => {

				if (err)
					console.error(err);
				else
					self.bg.database_mgr["push" + self.key](items);
			});
	};

	this.exportData = function (inline) {

		return new Promise(
			(resolve, reject) => {

				let text = ["["];
				
				async.each(self[self.key.toLowerCase() + "s"],
					(item_name, next) => {
						
						self.storage["get" + self.key](
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
								resolve(browser.downloads.download({ url: URL.createObjectURL( new File(text, self.key.toLowerCase() + "s.json", {type: "application/json"}) ) }));
						}
						
					});
			});
	}

}
