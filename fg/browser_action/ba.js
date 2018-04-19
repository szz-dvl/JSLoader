function Action (opt) {

	var self = this;
	
	this.val = opt.val;
	this.id = opt.id;
	this.pointed = false;
	
	this.submenu = opt.submenu ? opt.submenu.map(
		subaction => {
			
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
	}

	this.onLeave = function () {
	
		self.pointed = false;		
	}
	
};

function Menu (bg) {

	var self = this;

	this.bg = bg;
	this.menu;
	this.app = angular.module('MenuApp', []);

	this.groups = this.bg.group_mgr.groups.map(
		group => {
			
			return {val: group, id: "add_grp_" + group,
					onClick: function () {
						self.bg.showUnattachedEditor(group);
					}};
		});

	this.groups.push({val: "New Group", id: "add_new_grp",
					  onClick: function () {
						  self.bg.showUnattachedEditor();
					  }});
	
	this.app.controller('menuController', function ($scope) {
		
		self.menu = $scope;
		
		$scope.user_actions = [

			/* To page action */
			
			new Action({val: "Add script for this page", id: "add_script",
						onClick: function () {
							self.bg.showEditorForCurrentTab();
						}
					   }),
			
			new Action({ val: "Add script to group", id: "add_script_gr", submenu: self.groups }),
			
			new Action({ val: "Add this page to group", id: "add_site_to_grp",
						 onClick: function () {
							 self.bg.addSiteToGroup();
						 }
					   }),

			new Action({ val: "Listen page requests.", id: "listen_page_req",
				onClick: function () {
					self.bg.listenRequestsForCurrentTab();
				}
			}),

			/* END to page action */

			/* Only shortcut? */
			
			new Action({val: "Options", id: "options_page",
				onClick: function () {
					self.bg.option_mgr.openPage();
				}
			}),

			new Action({val: "Test", id: "test_test",
				onClick: function () {
					self.bg.database_mgr.pushDomains();
				}
			}),

			/* END only shortcut? */


			/* Temp */
			
			new Action({val: "Reload", id: "reload",
				onClick: function () {
					browser.runtime.reload();
				}
			}),
			
			new Action({val: "Clean", id: "clean", submenu:
						[{val: "Groups", id: "clean_groups",
						  onClick: function (ev) {
							  ev.stopPropagation();
							  self.bg.group_mgr.clear();
							  
						  }},
						 {val: "Settings", id: "clean_settings",
						  onClick: function (ev) {
							  ev.stopPropagation();
							  self.bg.option_mgr.clear();
							  
						  }},
						 {val: "Domains", id: "clean_domains",
						  onClick: function (ev) {
							  ev.stopPropagation(ev);
							  self.bg.domain_mgr.clear();
							  
						  }},
						 {val: "Rules", id: "clean_rules",
						  onClick: function (ev) {
							  ev.stopPropagation(ev);
							  self.bg.rules_mgr.clear();
							  
						  }}
						],
						
						onClick: function (ev) {
							ev.stopPropagation();
							browser.storage.local.clear();							
						}
						
					   })
		];
	});

	/* END Temp */
	
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
