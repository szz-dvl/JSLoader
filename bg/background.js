function BG_mgr () {
	
	let self = this;

	this.app_events = new EventEmitter();
	
	this.option_mgr = new OptionMgr(self);
	this.domain_mgr = new DomainMgr(self);
	this.group_mgr = new GroupMgr(self);
	this.content_mgr = new CSMgr(self);
	this.editor_mgr = new EditorMgr(self);
	this.notify_mgr = new NotificationMgr(self);
	this.tabs_mgr = new TabsMgr(self);
	this.rules_mgr = new RulesMgr(self);
	this.database_mgr = new DBMgr(self);
	
	this.getPASite = function () {
		
		return new Promise (
			(resolve, reject) => {

				browser.tabs.query({currentWindow: true, active: true})
					.then(tab_info => {
						
						self.tabs_mgr.getCurrentURL()
							.then(url => {
								
								self.domain_mgr.getEditInfoForUrl(url)
									.then(
										nfo => {

											nfo.url = url.href;
											nfo.tabId = tab_info[0].id;
											resolve(nfo);
											
										}, reject);
								
							});
					});

			});
				
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
							
							self.notify_mgr.info("Content scripts not available: This page seems to be blocking your scripts ... =(");
							
						}
					);
				
			}, console.error);
	};

	this.showUnattachedEditor = function (group_name) {
		
		self.group_mgr.getOrCreateItem(group_name, false)
			.then(
				group => {
					self.editor_mgr.openEditorInstanceForGroup(group);
				});
	};

	this.listenRequestsForCurrentTab = function () {

		browser.tabs.query({active: true, windowType: 'normal'})
			.then(
				tab_info => {
					self.tabs_mgr.openListenerInstance(tab_info[0]);
				}
			);
	}
	
	this.receiveCmd = function (command) {
		
		switch(command) {
			
			case "add-script-for-tab":
				self.showEditorForCurrentTab();
				break;
				
			case "new-group-new-script":
				self.showUnattachedEditor(null);
				break;
				
			case "listen-request-for-tab":
				self.listenRequestsForCurrentTab();
				break;
				
			case "open-option-page-devel":
			case "open-option-page":
				self.option_mgr.openPage();
				break;
				
			default:
				break;
		}
	};
	
}

BG_mgr.call(this);

browser.commands.onCommand.addListener(this.receiveCmd);
