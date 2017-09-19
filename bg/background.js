function BG_mgr () {

	var self = this;

	this.tab_mgr = new TabMgr(self);
	this.domain_mgr = new DomainMgr(self);
	this.option_mgr = new OptionMgr(self);
	this.editor_mgr = new EditorMgr(self);

	this.notification_ID = "jsloader-notification";

	this.notifyUser = function (title, message) {
		
		browser.notifications.create(self.notification_ID, {
			"type": "basic",
			"iconUrl": browser.extension.getURL("fg/icons/Diskette_32.png"),
			"priority": 2,
			"title": title,
			"message": message
		});

	};
	
	this.__showPageAction = function (tabInfo) {
		
		browser.tabs.get(tabInfo.tabId)
			.then(
				tab => {
			
					var url = new URL(tab.url);
					
					if (["http:", "https:"].includes(url.protocol)) {
					
						self.domain_mgr.haveInfoForUrl(url)
							.then(
								any => {
									
									if (any)
										browser.pageAction.show(tab.id);
									else 
										browser.pageAction.hide(tab.id);
								}
							);
					}
				}
			);
	};

	
	this.getOptPage = function () {
		
		return new Promise (
			(resolve, reject) => {
				
				self.domain_mgr.getFullDomains(
					domains => {
						resolve(domains);
					}
				);
			}
		);
	};

	this.getPASite = function () {

		return new Promise (
			(resolve, reject) => {
				
				self.tab_mgr.getCurrentUrl()
					.then(url => {

						self.domain_mgr.getEditInfoForUrl(url)
							.then(resolve, reject);
				
					});
			});
	};
	
	this.logJSLError = function (err) {
		
		console.error(err);

	};
	
	this.showEditorForCurrentTab = function () {
		
		self.tab_mgr.getCurrentTab()
			.then(
				tab => {
					
					if (tab.editor)
						tab.editor.wdw.child.focus();
					else 
						self.editor_mgr.openEditorInstanceForTab(tab)
						.then(null, self.logJSLError);
					
				}, self.logJSLError);
	};

	this.broadcastEditors = function (message) {
		
		browser.runtime.sendMessage(message);
		
	};

	this.toDomain = function (desc) {
		return new Domain (desc);
	}

	this.exportScripts = function () {

		self.domain_mgr.getFullDomains(
			domains => {
				
				var text = ["["];
				
				for (domain of domains) {
					text.push.apply(text, JSON.stringify(domain.__getDBInfo()).split('\n'));
					text.push(",");
				}

				text.pop(); // last comma
				text.push("]");
				
				browser.downloads.download({ url: URL.createObjectURL( new File(text, "scripts.json", {type: "application/json"}) ) });
			}
		);
	};

	this.exportSettings = function () {
				
		browser.downloads.download(
			{ url: URL.createObjectURL(
				new File(
					JSON.stringify(self.option_mgr.getFullOpts()).split('\n'),
					"settings.json",
					{type: "application/json"}
				)
			)}
		);
	};
}		

BG_mgr.call(this);

browser.tabs.onActivated.addListener(this.__showPageAction);
browser.commands.onCommand.addListener(this.showEditorForCurrentTab);
