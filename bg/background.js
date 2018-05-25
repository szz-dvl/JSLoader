function BG_mgr () {

	this.app_events = new EventEmitter();

	this.database_mgr = new DBMgr(this);
	this.option_mgr = new OptionMgr(this);
	this.domain_mgr = new DomainMgr(this);
	this.group_mgr = new GroupMgr(this);
	this.content_mgr = new CSMgr(this);
	this.editor_mgr = new EditorMgr(this);
	this.notify_mgr = new NotificationMgr(this);
	this.tabs_mgr = new TabsMgr(this);
	this.proxy_mgr = new ProxyMgr(this);
	this.resource_mgr = new ResourceMgr(this);
	
	this.getPASite = () => {
		
		return new Promise (
			(resolve, reject) => {
				
				this.tabs_mgr.getCurrentURL()
					.then(tabnfo => {
						
						this.domain_mgr.getEditInfoForUrl(tabnfo.url)
							.then(
								nfo => {
									
									nfo.url = tabnfo.url.href;
									nfo.tabId = tabnfo.tab;
									
									resolve(nfo);
									
								}, reject);
					});
			});	
	};
	
	this.showEditorForCurrentTab = () => {
		
		browser.tabs.query({currentWindow: true, active: true})
			.then(tab_info => {
				
				this.content_mgr.forceMainFramesForTab(tab_info[0].id)
					.then(
						() => {
							
							this.editor_mgr.openEditorInstanceForTab(tab_info[0]);
							
						},
						() => {
							
							this.notify_mgr.info("Content scripts not available: This page seems to be blocking your scripts ... =(");
							
						}
					);
				
			}, console.error);
	};

	this.showUnattachedEditor = (group_name) => {
		
		this.group_mgr.getOrCreateItem(group_name, false)
			.then(
				group => {
					this.editor_mgr.openEditorInstanceForGroup(group);
				});
	};
	
	this.readLocalFile = (path) => {
		
		return new Promise(
			(resolve, reject) => {
				
				fetch(browser.extension.getURL(path))
					.then(
						response => {
							
							response.text().then(resolve, reject);
							
						}, reject
					);
			}
		);
	};
	
	this.receiveCmd = (command) => {
		
		switch(command) {
			
			case "add-script-for-tab":
				this.showEditorForCurrentTab();
				break;
				
			case "new-group-new-script":
				this.showUnattachedEditor(null);
				break;
				
			case "open-option-page-devel":
			case "open-option-page":
				browser.runtime.openOptionsPage();
				break;
				
			default:
				break;
		}
	};
	
}

BG_mgr.call(this);

/* browser.storage.local.clear(); */
browser.commands.onCommand.addListener(this.receiveCmd);

