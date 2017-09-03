
function BG_mgr () {

	var self = this;
	
	this.editor_mgr = new EditorMgr(this);
	this.domain_mgr = new DomainMgr(this);
	this.tab_mgr = new TabMgr(this);
	this.option_mgr = new OptionMgr(this);

	this.app = angular.module('JSLoaderApp', []);
	
	//global_storage.bg = this;
	
	/* this.editor_msg = function(eid, action, msg, err) {

	   browser.runtime.sendMessage({
	   id: eid,
	   action: action,
	   message: msg,
	   err: err
	   });
	   };

	   this.error_msg = function(eid, msg) {

	   console.error(msg);

	   this.editor_msg (eid, "result", msg, true);
	   };

	   this.info_msg = function(eid, msg) {

	   this.editor_msg (eid, "result", msg, false);
	   };
	   
	   this.handle_response = function(response) {

	   browser.runtime.sendMessage({
	   message: obj.err ? obj.err : obj.response,
	   err: obj.err ? true : false
	   });
	   
	   }; */
	
	
	this.__showPageAction = function (tabInfo) {

		var url = new Url(tabInfo[0].url);
		
		if (["http:", "https:"].indexOf(url.protocol) >= 0) {
			
			self.domain_mgr.haveInfoForUrl(url).then(any => {
				
				if (any)
					browser.pageAction.show(tabInfo.id);
				
			});
		}
	};

	
	/* this.getMyScripts = function () {

	   
	   return domain_mgr.getEditInfoForUrl(new URL(self.currTab.url));
	   }; */

	this.getOptPage = function () {
		
		return new Promise (function (resolve, reject) {
			
			domain_mgr.getFullDomains(arr => {
				
				resolve({domains: arr, opts: option_mgr.getCurrent()});
				
			});
		});
	};
	
	this.showEditorForCurrentTab = function () {

		self.tab_mgr.getCurrentTab()
			.then(tab => {

				self.domain_mgr.createScriptForUrl(tab.url)
					.then(script => {

						self.editor_mgr.openEditorInstance(script)
							.then(null, self.logJSLError);
						
					}, self.logJSLError);
				
			}, self.logJSLError);
			
	}; 
}

var bg_manager = new BG_mgr();		

browser.tabs.onActivated.addListener(bg_manager.__showPageAction);
browser.commands.onCommand.addListener(bg_manager.showEditorForCurrentTab);
