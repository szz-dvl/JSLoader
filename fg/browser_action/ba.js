function Action (opt) {

	var self = this;

	this.val = opt.val;
	this.id = opt.id;
	this.pointed = false;
	this.subaction = opt.subaction || false;
	
	this.submenu = opt.submenu ? opt.submenu.map(
		subaction => {
			
			subaction.subaction = true;
			return new Action(subaction);
			
		}) : [];
	
	this.onClick = opt.onClick || (() => {});
	
	this.canHide = function () {
		
		return self.submenu.every(
			subaction => {
				
				return !subaction.pointed;
				
			});
	};

	this.onEnter = function () {
		
		self.pointed = true;
		
		if (!self.subaction) 
			$("#" + self.id).find( ".hidden-elem" ).show();
	}

	this.onLeave = function () {
	
		self.pointed = false;
		
		if (!self.subaction && self.canHide()) 
			$("#" + self.id).find( ".hidden-elem" ).hide();
		
	}
	
};

function Menu (bg) {

	var self = this;

	this.bg = bg;
	this.menu;
	this.app = angular.module('MenuApp', []);
	
	this.app.controller('menuController', function ($scope) {
		
		self.menu = $scope;
		
		$scope.user_actions = [
			
			new Action({val: "Add script For ...", id: "add_script",
						onClick: function () {
							self.bg.showEditorForCurrentTab();
						}
					   }),
			
			new Action({val: "Export ...", id: "export", submenu: [
				{val: "Scripts", id: "export_scripts",
				 onClick: function () {
					 self.bg.exportScripts();
				 }
				},
				{val: "Settings", id: "export_settings",
				 onClick: function () {
					 self.bg.exportSettings();
				 }
				}
			]}),
			
			new Action({val: "Options", id: "options_page",
						onClick: function () {
							self.bg.option_mgr.openPage();
						}
					   }),
			
			new Action({val: "Clean", id: "clean",
						onClick: function () {
							browser.storage.local.clear();
						}
					   })
		];
	});
	
	angular.element(document)
		.ready(
			() => {
				
				angular.bootstrap(document, ['MenuApp']);
				
			}
		);
}

browser.runtime.getBackgroundPage()
	.then(
		page => {
			
			Menu.call(this, page);	
		}
	);
