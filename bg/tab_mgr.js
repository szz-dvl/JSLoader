function BaseTab (tabInfo) {

	var self = this;
	
	Object.assign(this, tabInfo);
	
	this.url = new URL(this.url);
	this.id = parseInt(this.id);
	
	this.runScripts = function (scripts, runForEditor) {
		
		return new Promise((resolve, reject) => {
				
			browser.tabs.sendMessage(
				
				self.id,
				{ action: "run", scripts: scripts.map(
					script => {
						return script.code;
					})
				}
				
			).then (
				response => {
						
					if (!response.status) {
						
						if (self.editor && runForEditor)
							self.editor.message(response.message[0], true);
						else
							console.error(response.message); /* Notify? */
					}
					
					resolve(response);
						
				}, reject)
		});
		
	};
}


function JSLTab (tabInfo, parent) {
	
	var self  = this;
	
	BaseTab.call(this, tabInfo);

	this.parent = parent;
	this.editor;
	
	self.parent.tabs.push(this);
	
	this.runForEditor = function () {
		
		if (!self.editor)
			return Promise.reject ( {err: "No editor found."} );
		else 
			return self.runScripts([self.editor.script], true);
	};

	this.attachEditor = function (editor) {

		return new Promise(
			(resolve, reject) => {

				/* Must never happen */
				if (self.editor)
				
					reject({err: "Editor already present."});
			
				else {
				
					browser.tabs.sendMessage(
					
						self.id,
						{ action: "backup" }
					
					).then (
						response => {

							console.log("Atacched editor: ");
							console.log(response);

							self.editor = editor;
						
							response.editor = self.editor;
							resolve(response);
						
						}, reject);
				}
			});
	};

	this.deattachEditor = function () {

		return new Promise((resolve, reject) => {

			/* Must never happen */
			if (!self.editor)

				reject ({err: "No editor found."});
			
			else {

				self.revertChanges()
					.then(
						response => {
							
							self.editor = null;

							console.log("Removing tab " + self.id);
							
							self.parent.tabs.remove(
								self.parent.tabs.findIndex(
									tab => {
										return tab.id == self.id;
									}
								)
							);
							
							resolve(response);
							
						}, reject);
			}
		});
	}

	this.revertChanges = function () {
		
		/* Must never happen */
		if (!self.editor)
			
			return Promise.reject ({err: "No editor found."});
		
		else {

			return browser.tabs.sendMessage(
				
				self.id,
				{action: "revert", backup: self.editor.backup}
				
			);
		}
	};
}

function TabMgr (bg) {

	var self = this;

	this.bg = bg;
	this.tabs = [];

	this.getTabAt = function (url) {

		return new Promise ((resolve, reject) => {
			
			browser.tabs.query({url: url.href})
				.then(tab_info => {
							
					resolve (new JSLTab(tab_info[0], self));
						
				}, reject);
		});


	};
	
	this.getTabFor = function (url) {

		self.tabs.filter(
			tab => {
				return tab.url.match(url);
			}
		)[0] || null;
	};

	this.getOrCreateTabFor = function (url) {

		return new Promise (
			(resolve, reject) => {
			
				var tab = self.getTabFor(url);
			
				if (tab)
					resolve({tab: tab, created: false});

				else {
					
					browser.tabs.create({url: url.href})
						.then(
							tab => {
				
								resolve({tab: new JSLTab(tab, self), created: true});
								
							}, reject
						);
				}
			}
		);
	};
	
	this.__getTabById = function (tid) {

		return self.tabs.filter(tab => {
			
			return tab.id == tid;

		})[0];
	};

	this.updateTabs = function (tabId, changeInfo, tabInfo) {

		var tab = self.__getTabById(tabId);
		
		if (tab) {

			/* Changing angular view from here ignored! */
			if (changeInfo.url) 
				tab.url = new URL(changeInfo.url);

			if (changeInfo.status == "complete") {

				console.log("tab: " + tabInfo.url + " COMPLETE!");
				console.log(tabInfo);
				tab.status = "complete";
				
				tab.attachEditor(self.bg.editor_mgr.getEditorForTab(tab))
					.then(null,
						  err => {

							  console.error("Complete attach rejected!!");
							  console.log(err)

						  });
				
			}
			
		} else
			tab = new BaseTab(tabInfo);

		// console.log("Tab " + tabId + " updating, changes: ");
		// console.log(changeInfo);

		if (tab.status == "complete") {
			
			self.bg.domain_mgr.getScriptsForUrl(tab.url)
				.then(
					scripts => {
						
						if (scripts) {
							
							tab.runScripts(scripts, false)
								.then(
									response => {
										
										console.log("Scripts run: ");
										console.log(response);
										
									},
									err => {
										
										/* Must never happen */
										console.log("Script rejection run: ");
										console.log(err);

									});
						}
						
					});
		}
	};

	this.checkTab = function (id) {
		
		return browser.tabs.sendMessage (
					
			id,
			{ action: "check" }
			
		);
			
	};
							 
	this.getCurrentTab = function () {

		return new Promise ((resolve, reject) => {
			
			browser.tabs.query({currentWindow: true, active: true})
				.then(tab_info => {
					
					console.log("currentTab: ");
					console.log(tab_info);

					self.checkTab(parseInt(tab_info[0].id))
						.then(
							response => {
								
								resolve(self.tabs.filter(
									tab => {
										
										return tab.id == tab_info[0].id;
										
									})[0] || new JSLTab(tab_info[0], self));

							},
							err => {

								self.bg.notifyUser("CSP Block", "Unable to open editor for tab ..." + tab_info[0].id);
								console.error(err);
								reject(err);
							}
						);
				});
		
		});
	};
	
	browser.tabs.onUpdated.addListener(self.updateTabs);
}
