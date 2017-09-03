function onError (error) {
	
	throw new Error(error);
}

function Menu (bg) {

	var self = this;

	this.bg = bg;
	this.menu;
	this.app = angular.module('MenuApp', []);

	this.getActionById = function (id) {

		for (action of self.menu.user_actions) {

			// console.log("An action: ");
			// console.log(action);
			
			if (action.id == id) 
				return action;
			
			if (action.submenu) {
				for (subaction of action.submenu) {

					if (subaction.id == id)
						return subaction;
				
				}
			}
		}
			
	};

	this.actionCanHide = function (action) {
		
		return !action.submenu.filter(subaction => {
						
			return subaction.pointed;
			
		}).length;
	};

	this.app.controller('menuController', function ($scope) {
		
		self.menu = $scope;

		$scope.user_actions = [
			
			{val: "Add script For ...", id: "add_script"},
			
			{val: "Import ...", id: "import", submenu: [
				{val: "Scripts", id: "import_scripts", pointed: false},
				{val: "Settings", id: "import_settings", pointed: false}
			]},
			
			{val: "Export ...", id: "export", submenu: [
				{val: "Scripts", id: "export_scripts", pointed: false},
				{val: "Settings", id: "export_settings", pointed: false}
			]},
			
			{val: "Options", id: "options_page"},
			{val: "Clean", id: "clean"}
		];
		
		$scope.actionClick = function (ev) {

			//console.log("actionClick: " + ev.currentTarget.id);
			
			switch (ev.currentTarget.id) {
			case "add_script":
				self.bg.showEditorForCurrentTab();
				break;
			case "options_page":
				browser.runtime.openOptionsPage();
				break;
			case "clean":
				browser.storage.local.clear();
				break;
			case "import_scripts":
			case "import_settings":
			case "export_scripts":
			case "export_settings":
				console.log("Unimplemented.");
			default:
				break;
			}
			
		};

		$scope.actionEnter = function (ev) {

			//console.log("actionEnter: " + ev.currentTarget.id);
			
			switch (ev.currentTarget.id) {

			case "add_script":
			case "options_page":
				break;
				
			case "import":
			case "export":
				$(ev.currentTarget).find( ".hidden-elem" ).fadeIn();
				break;
				
			case "import_scripts":
			case "import_settings":
			case "export_scripts":
			case "export_settings":
				self.getActionById(ev.currentTarget.id).pointed = true;
			default:
				break;
			}
			
		};

		$scope.actionLeave = function (ev) {

			var action;

			//console.log("actionLeave: " + ev.currentTarget.id);
			
			switch (ev.currentTarget.id) {

			case "add_script":
			case "options_page":
				break;
				
			case "import":
			case "export":

				action = self.getActionById(ev.currentTarget.id);
				
				if (self.actionCanHide(action))
					$(ev.currentTarget).find( ".hidden-elem" ).fadeOut();
				
				break;
				
			case "import_scripts":
			case "import_settings":

				self.getActionById(ev.currentTarget.id).pointed = false;
				action = self.getActionById("import");

				if (self.actionCanHide(action)) {

					// console.log("Hidding import");
					// console.log(action);
					
					$("#import").find( ".hidden-elem" ).fadeOut();
				}
				break;
				
			case "export_scripts":
			case "export_settings":

				self.getActionById(ev.currentTarget.id).pointed = false;
				action = self.getActionById("export");
				
				if (self.actionCanHide(action)) {
					
					// console.log("Hidding export");
					// console.log(action);
					
					$("#export").find( ".hidden-elem" ).fadeOut();
				}
				
				break;
				
			default:
				break;
			}
			
		};	
	});
	
	
	/* Init */
	
	angular.element(document).ready( () => {
			
		angular.bootstrap(document, ['MenuApp']);
			
	});
		
}

browser.runtime.getBackgroundPage().then(page => {

	page.bg_manager.app.ba = new Menu(page.bg_manager);
	
}, onError);
