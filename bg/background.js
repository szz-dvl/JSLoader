function BG_mgr () {

	var self = this;
	
	//this.tab_mgr = new TabMgr(self);
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
					
					var url = new URL(tab.url).sort();
					
					if (["http:", "https:"].includes(url.protocol)) {
						
						self.domain_mgr.haveInfoForUrl(url)
							.then(
								any => {
									//console.log((any ? "Info" : "No Info") + " for " + url.href);
									
									if (any)
										browser.pageAction.show(tab.id);
									else 
										browser.pageAction.hide(tab.id);
									
								});	

					} else
						console.error("Bad URL: " + url.href);
				}
				
			);
	};

	this.getStoredData = function () {

		return new Promise(
			(resolve, reject) => {

				self.domain_mgr.getFullDomains(
					domains => {
						
						self.group_mgr.getFullGroups(
							groups => {

								resolve({domains: domains, groups: groups});

							}
						);
					}
				);
			}
		)
	};
	
	this.getOptPage = function () {
		
		return new Promise (
			(resolve, reject) => {
				
				self.getStoredData().then(
					data => {
						
						resolve(data);
					}
				);
			}
		);
	};

	this.getCurrentUrl = function () {

		return new Promise ((resolve, reject) => {
			
			browser.tabs.query({currentWindow: true, active: true})
				.then(tab_info => {
					resolve(new URL(tab_info[0].url).sort());
				}, reject)
		});

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
				
				let frames = self.content_mgr.getFramesForTab(tab_info[0].id);
				
				if (!frames.length) {
					
					self.content_mgr.waitForFrames(tab_info[0].id)
						.then(
							() => {
								
								self.editor_mgr.openEditorInstanceForTab(tab_info[0]);
								
							},
							() => {
								
								self.notifyUser("Content scripts not available", "This page seems to be blocking your scripts ... =(");
											
							}
						);
				} else
					self.editor_mgr.openEditorInstanceForTab(tab_info[0]);
				
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
				browser.tabs.query({url: "*://*." + url.name() + "*"})
					.then(
						tabs => {
							
							resolve(tabs);
							
						}
					)
			}
		)
	};

	/* Script as param!*/
	this.updatePA = function (script) {

		var url;
		
		if (typeof(script) === "string")
			url = new URL(url);
		else if (typeof(script) === "function") {

			if (parent.isDomain()) 
				url = parent.getUrl();

		}

		if (url) {
			
			self.getTabsForURL(url)
				.then(
					tabs => {

						// console.log("updating tabs for " + url.name());
						// console.log(tabs);
					
						for (tab of tabs) 
							self.__showPageAction(tab.id);
					
					}
				);
		}
	};

}

BG_mgr.call(this);

browser.tabs.onActivated.addListener(this.__showPageAction);
//browser.tabs.onCreated.addListener(this.__showPageAction);
browser.tabs.onUpdated.addListener(this.__showPageAction);
browser.commands.onCommand.addListener(this.receiveCmd);
//browser.runtime.onMessage.addListener(this.sendScriptsForURL);

