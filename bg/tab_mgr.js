function BaseTab (tabInfo) {

	var self = this;
	
	Object.assign(this, tabInfo);
	
	this.url = new URL(this.url);
	this.id = parseInt(this.id);
	
	/* Run scripts in content here, either with jsloader or via tabs.executeScript */
}


function JSLTab (tabInfo, parent) {
	
	var self  = this;
	
	BaseTab.call(this, tabInfo);

	this.parent = parent;
	this.editor;

	self.parent.tabs.push(this);

	this.run = function () {
		
		return new Promise((resolve, reject) => {

			if (!self.editor)
				reject ( {err: "No editor found."} );
			else {

				console.log(self.editor.script.code);
				browser.tabs.sendMessage(
					
					self.id,
					{ action: "run", scripts: {arr: [self.editor.script.code]} }
					
				).then(
					response => {

						/* On receiving end does not exists try: tabs.executeScript*/
					
						if (response.err)
							self.editor.message(response.err[0], true);
						
						resolve(response);
					
					}, reject);
			}
		});
	};

	this.attachEditor = function (editor) {

		return new Promise((resolve, reject) => {

			/* Must never happen */
			if (self.editor)

				reject({err: "Editor already present."});
			
			else {
				
				browser.tabs.sendMessage(
					
					self.id,
					{ action: "backup" }
				
				).then(response => {

					self.editor = editor;
					
					response.editor = self.editor;
					resolve(response);
					
				}, reject);
			}
		});
	}

	this.deattachEditor = function () {

		return new Promise((resolve, reject) => {

			/* Must never happen */
			if (!self.editor)

				reject ({err: "No editor found."});
			
			else {

				self.revertChanges().then(response => {

					self.editor = null;

					/* Remove from mgr !!! */
					resolve(response);
						
				}, reject);
			}
		});
	}

	this.revertChanges = function () {

		return new Promise((resolve, reject) => {

			/* Must never happen */
			if (!self.editor)

				reject ({err: "No editor found."});
			
			else {

				browser.tabs.sendMessage(
						
					self.id,
					{action: "revert"}
			
				).then(response => {
				
					resolve(response);
					
				}, reject);
			}
		});
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
		
		for (tab of self.tabs) {
			
			if (tab.url.match(url))
				return tab;
		}
		
		return false;
	};

	this.getOrCreateTabFor = function (url) {

		return new Promise ( (resolve, reject) => {

			var tab = self.getTabFor(url);
			
			if (tab)
				resolve({tab: tab, created: false});
					
			browser.tabs.create({url: url.href}).then(tab => {
				
				resolve({tab: new JSLTab(tab, self), created: true});
					
			}, reject);
		});
		
	};

	this.__getTabById = function (tid) {

		return self.tabs.filter(tab => {
			
			return tab.id == tid;

		})[0];
	};

	this.updateTabs = function (tabId, changeInfo, tabInfo) {

		var tab = self.__getTabById(tabId) || new JSL;
		var url = new URL(tabInfo.url);
		
		if (tab) {
			
			if (changeInfo.url) 
				tab.editor.scope.user_action.target = url.hostname + url.pathname;

		}

		// console.log("Tab " + tabId + " updating, changes: ");
		// console.log(changeInfo);
		
		self.bg.domain_mgr.getScriptsForUrl(url).then(scripts => {

			if (scripts) {
				
				window.setTimeout(() => {
					
					browser.tabs.sendMessage(
					
						tabId,
						{scripts: scripts, action: "run"}
						
					).then(response => {
						
						if (response.err)
							self.bg.logContentError(response.err);
					
					}, self.bg.logJSLError);
					
				}, 500);

			}
			
		});
	};

	this.getCurrentTab = function () {

		return new Promise ((resolve, reject) => {
			
			browser.tabs.query({currentWindow: true, active: true})
				.then(tab_info => {

					// console.log("currentTab: ");
					// console.log(tab_info[0]);

					resolve(self.tabs.filter(
						tab => {
							
							return tab.id == tab_info.id;
							
						})[0] || new JSLTab(tab_info[0], self));
					
				}, reject);
		});
		
	}
	
	browser.tabs.onUpdated.addListener(self.updateTabs);
}
