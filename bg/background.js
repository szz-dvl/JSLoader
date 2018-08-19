function BG_mgr () {

	this.app_events = new EventEmitter();
	this.pa_events = null;
	
	this.db = global_storage.db;
	this.option_mgr = new OptionMgr(this);
	this.domain_mgr = new DomainMgr(this);
	this.group_mgr = new GroupMgr(this);
	this.content_mgr = new CSMgr(this);
	this.editor_mgr = new EditorMgr(this);
	this.notify_mgr = new NotificationMgr(this);
	this.tabs_mgr = new TabsMgr(this);
	this.proxy_mgr = new ProxyMgr(this);
	this.resource_mgr = new ResourceMgr(this);
	this.texts = new TranslationMgr(this);
	
	
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
									
								}, console.error);
						
					}, reject);
			});	
	};
	
	this.showEditorForCurrentTab = () => {
		
		browser.tabs.query({active: true, windowType: "normal"})
			.then(tab_info => {
				
				this.content_mgr.forceMainFramesForTab(tab_info[0].id)
					.then(
						() => {
							
							if (tab_info[0].url.startsWith("file://"))
								this.notify_mgr.info("Local files won't accept content scripts ... =(");
							else
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
				
			case "open-option-page":
				browser.runtime.openOptionsPage();
				break;
				
			default:
				break;
		}
	};

	this.reIndex = () => {
		
		return new Promise(
			(resolve, reject) => {
				
				Promise.all([
					
					this.domain_mgr.reIndex(),
					this.group_mgr.reIndex()
						
				]).then(resolve, reject);
			})
	}
	
	this.storeChanges = (changes, area) => {
		
		if (area != global_storage.room)
	 		return;
		
		for (key of Object.keys(changes)) {

			switch(key) {

				case "domains":

					this.domain_mgr.domains = changes.domains.newValue || [];
					break;
					
				case "groups":

					this.group_mgr.groups = changes.groups.newValue || [];
					break;

				case "userdefs": 

					this.content_mgr.defs = changes.userdefs.newValue || "";
					break;
					
				default:
					break;
			}
			
		}
	};
	
	browser.storage.onChanged.addListener(this.storeChanges);
	browser.commands.onCommand.addListener(this.receiveCmd);
	
	this.db.on('db_change', string => {

		this.reIndex();

	});

	this.reIndex();
		
}

	
global_storage.once('ready', () => {
	
	BG_mgr.call(this);

});
