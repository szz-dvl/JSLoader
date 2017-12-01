function BG_mgr () {

	let self = this;
	
	this.domain_mgr = new DomainMgr(self);
	this.group_mgr = new GroupMgr(self);
	this.content_mgr = new CSMgr(self);
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
		
		browser.tabs.get(tabInfo.tabId || tabInfo)
			.then(
				tab => {

					/* Update editors if necessary */
					var url = new URL(tab.url).sort();
					
					if (["http:", "https:"].includes(url.protocol)) {
						
						self.domain_mgr.haveInfoForUrl(url)
							.then(
								any => {
									
									if (any)
										browser.pageAction.show(tab.id);
									else 
										browser.pageAction.hide(tab.id);
									
								});	

					} 
				}
			);
	};

	this.getCurrentUrl = function () {
		
		return new Promise (
			(resolve, reject) => {
			
				browser.tabs.query({currentWindow: true, active: true})
					.then(tab_info => {
						resolve(new URL(tab_info[0].url).sort());
					}, reject)
			}
		);

	};
	
	this.getPASite = function () {
		
		return new Promise (
			(resolve, reject) => {
				
				self.getCurrentUrl()
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
		
		browser.tabs.query({currentWindow: true, active: true})
			.then(tab_info => {
					
				self.content_mgr.forceMainFramesForTab(tab_info[0].id)
					.then(
						() => {
							
							self.editor_mgr.openEditorInstanceForTab(tab_info[0]);
								
						},
						() => {
							
							self.notifyUser("Content scripts not available", "This page seems to be blocking your scripts ... =(");
											
						}
					);
				
			}, self.logJSLError);
	};

	this.showUnattachedEditor = function (group_name) {
		
		self.group_mgr.getOrCreateItem(group_name, false)
			.then(
				group => {
					self.editor_mgr.openEditorInstanceForGroup(group);
				});
	};
	
	this.addSiteToGroup = function () {
		
		self.group_mgr.showChooserWdw();
		
	};
	
	this.receiveCmd = function (command) {
		
		switch(command) {
			
		case "add-script-for-tab":
			self.showEditorForCurrentTab();
			break;
			
		case "add-site-to-group":
			self.addSiteToGroup();
			break;
			
		case "new-group-new-script":
			self.showUnattachedEditor(null);
			break;
			
		default:
			break;
		}
	};
	
	this.broadcastEditors = function (message) {
		
		browser.runtime.sendMessage(message);
		
	};

	this.toDomain = function (desc) {
		return new Domain (desc);
	};

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

	this.exportGroups = function () {

		self.domain_mgr.getFullGroups(
			groups => {
				
				var text = ["["];
				
				for (group of groups) {
					
					text.push.apply(text, JSON.stringify(group.__getDBInfo()).split('\n'));
					text.push(",");
				}

				text.pop(); // last comma
				text.push("]");
				
				browser.downloads.download({ url: URL.createObjectURL( new File(text, "groups.json", {type: "application/json"}) ) });
			}
		);
	};

	this.getTabsForURL = function (url) {

		return new Promise(
			(resolve,reject) => {

				var my_url;
				
				if (typeof(url) == "string") {
					
					if (url.startsWith("*."))
						my_url = new URL("http://" + url.slice(2));
					else
						my_url = new URL(url);
					
				} else
					my_url = url;
				
				browser.tabs.query({url: "*://*." + my_url.name() + "*"})
					.then(
						tabs => {
							
							resolve(tabs);
							
						}
					)
			}
		)
	};
	
	this.updatePA = function (script) {

		/* Groups missing: To list! */
		var url = typeof(script) == "object" ? (script.getUrl() || (script.parent.isSubdomain() ? script.getParentName() : null)) : script;
		
		if (url) {
			
			self.getTabsForURL(url)
				.then(
					tabs => {
						
						for (tab of tabs) 
							self.__showPageAction(tab.id);
						
					}
				);
		}
	};
}

BG_mgr.call(this);

browser.tabs.onActivated.addListener(this.__showPageAction);
browser.tabs.onUpdated.addListener(this.__showPageAction);
browser.commands.onCommand.addListener(this.receiveCmd);

