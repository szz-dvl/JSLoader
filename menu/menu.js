var editor;
var bg;

function onError (error) {
	
	throw new Error(error);
}

function Menu () {

	var self = this;
	
	this.menu;

	this.getActionById = function (id) {

		for (action of self.menu.user_actions) {

			if (action.id == id)
				return action;

			for (subaction of action.submenu) {

				if (subaction.id == id)
					return subaction;
				
			}
			
		}
			
	};

	this.actionCanHide = function (action) {

		return action.submenus.filter(subaction => {
						
			return subaction.pointed;
						
		}).length	
	};
	
	this.menuController = function ($scope) {
		
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
			
			{val: "Options", id: "options_page"}
		];

		
		$scope.actionClick = function (ev) {

			switch (ev.target.id) {
				case "add_script":
					self.bg.showEditorForCurrentTab();
					break;
				case "options_page":
					browser.runtime.openOptionsPage();
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
			
			switch (ev.target.id) {
				case "import":
				case "export":
					$(ev.target.id).find( ".hidden-elem" ).fadeIn();
				case "import_scripts":
					$scope.user_actions[1].submenu[0].pointed = true;
				case "import_settings":
					$scope.user_actions[1].submenu[1].pointed = true;
				case "export_scripts":
					$scope.user_actions[2].submenu[0].pointed = true;
				case "export_settings":
					$scope.user_actions[2].submenu[1].pointed = true;
				default:
					break;
			}
			
		};

		$scope.actionLeave = function (ev) {

			var action;
			
			switch (ev.target.id) {
				case "import":
				case "export":

					action = self.getActionById(ev.target.id);
					
					if (self.actionCanHide(action))
						$(ev.currentTarget).find( ".hidden-elem" ).fadeOut();

					switch(action.id) {

						case "import":
							for (sub of $scope.user_actions[1].submenu) {

								sub.pointed = false;
								
							}
							break;
							
						case "export":
							for (sub of $scope.user_actions[2].submenu) {

								sub.pointed = false;
								
							}
							break;
						default:
							break;
					}

					break;
					
				case "import_scripts":
					$scope.user_actions[1].submenu[0].pointed = false;
				case "import_settings":
					$scope.user_actions[1].submenu[1].pointed = false;
					
					action = self.getActionById("import");

					if (self.actionCanHide(action))
						$("#import").find( ".hidden-elem" ).fadeOut();
					
					break;

				case "export_scripts":
					$scope.user_actions[2].submenu[0].pointed = false;
				case "export_settings":
					$scope.user_actions[2].submenu[1].pointed = false;

					action = self.getActionById("export");

					if (self.actionCanHide(action))
						$("#export").find( ".hidden-elem" ).fadeOut();
					
					break;
					
				default:
					break;
			}
			
		};	
	}
	
	/* Init */
	browser.runtime.getBackgroundPage().then(page => {
		
		self.bg = page.bg_manager;
		
		angular.element(document).ready( () => {
			
			self.bg.app.controller('menuController', self.menuController);
			angular.bootstrap(document, ['JSLoaderApp']);
			
		});
		
	}, onError);
}

var menu_mgr = new Menu();
