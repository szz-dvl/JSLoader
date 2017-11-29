function Option (opt, section) {

	var self = this;
	
	this.text = opt.text || "";
	this.type = opt.type || "checkbox";
	this.id = opt.id || null;
	this.value = opt.value || false;
	this.shown = opt.shown;
	
	this.__onChange = opt.change || null;
	this.sub_opts = opt.subopts ?
		opt.subopts.map(
			opt => {
				
				opt.shown = self.value;
				return new Option(opt, section);	
			}
		) : [];

	this.change = function () {

		section[self.id] = self.value;

		if (self.__onChange)
			self.__onChange(self);

		for (subopt of self.sub_opts) { 

			if (self.value)
				subopt.show();
			else
				subopt.hide();
		}
	};
	
	this.setVal = function (value) {
		
		section[self.id] = self.value = value;
		
		console.log("Opt " + self.id + " setting value to: " + self.value);
		
	};

	/* Subopts */
	this.show = function () {

		self.shown = true;
	};

	this.hide = function () {

		self.shown = false;
	};

}

function OP (bg, port) {
	
	let self = this;
	
	this.bg = bg;
	
	this.domain_list;
	this.group_list;
	this.themes;
	this.settings;
	this.tabs;
	
	this.app = angular.module('OptionsApp', ['jslPartials', 'ui.router']); 
	
	this.app.controller('tabsController', function ($scope, $timeout) {

		self.tabs = $scope;
		$scope.page = self;
		
		$scope.active = "domains";
		
		$scope.tabs = [ 

			{sref: 'settings', title: 'Settings'}, 
			{sref: 'domains', title: 'Domains'}, 
			{sref: 'groups', title: 'Groups'}, 
			{sref: 'userdefs', title: 'Userdefs'}, 
			{sref: 'storage', title: 'Storage'} 
		];
		
		$timeout(
			() => {
				
				$("#tab-" + $scope.active).addClass("active");
				
				$scope.tabs.map(
					tab => {
						
						$("#tab-" + tab.sref)
							.click(
								ev => {
								
									$(ev.target).siblings('.td-tab-link').removeClass("active");
									$(ev.target).addClass("active");
									
									$scope.active = tab.sref;
										
								}
							);
						
					});		
			}
		)
		
	});

	this.app.controller('userdefsController', function ($scope) {

		$scope.page = self;
		$scope.defs_shown = true;
		$scope.globs_shown = true;
		
		$scope.toggleDefs = function () {

			$scope.defs_shown = !$scope.defs_shown;

		};

		$scope.statusDefs = function () {

			return $scope.defs_shown ? "v" : ">";

		};

		$scope.toggleGlobs = function () {

			$scope.globs_shown = !$scope.globs_shown;

		};

		$scope.statusGlobs = function () {

			return $scope.globs_shown ? "v" : ">";

		};
		
	});
	
	
	this.app.controller('themeController', ($scope, $compile) => {

		self.themes = $scope;
		$scope.page = self;
		
		/* Ace editor rules here, highlightjs will share theme if available */
		$scope.list = [

			{name: "monokai", knownToHl: "monokai-sublime", title: "Hightlights available"}, /* "monokai-sublime" */
			{name: "ambiance", knownToHl: false, title: "Hightlights unavailable"},
			{name: "chaos", knownToHl: false, title: "Hightlights unavailable"},
			{name: "chrome", knownToHl: false, title: "Hightlights unavailable"},
			{name: "clouds", knownToHl: false, title: "Hightlights unavailable"},
			{name: "clouds_midnight", knownToHl: false, title: "Hightlights unavailable"},
			{name: "cobalt", knownToHl: false, title: "Hightlights unavailable"},
			{name: "crimson_editor", knownToHl: false, title: "Hightlights unavailable"},
			{name: "dawn", knownToHl: false, title: "Hightlights unavailable"},
			{name: "dreamweaver", knownToHl: false, title: "Hightlights unavailable"},
			{name: "eclipse", knownToHl: false, title: "Hightlights unavailable"},
			{name: "github", knownToHl: "github", title: "Hightlights available"},
			{name: "gob", knownToHl: false, title: "Hightlights unavailable"},
			{name: "gruvbox", knownToHl: "gruvbox-dark", title: "Hightlights available"},
			{name: "idle_fingers", knownToHl: false, title: "Hightlights unavailable"},
			{name: "iplastic", knownToHl: false, title: "Hightlights unavailable"},
			{name: "katzenmilch", knownToHl: false, title: "Hightlights unavailable"},
			{name: "kr_theme", knownToHl: false, title: "Hightlights unavailable"},
			{name: "kuroir", knownToHl: false, title: "Hightlights unavailable"},
			{name: "merbivore", knownToHl: false, title: "Hightlights unavailable"},
			{name: "merbivore_soft", knownToHl: false, title: "Hightlights unavailable"},
			{name: "mono_industrial", knownToHl: false, title: "Hightlights unavailable"},
			{name: "pastel_on_dark", knownToHl: false, title: "Hightlights unavailable"}, 
			{name: "solarized_dark", knownToHl: "solarized-dark", title: "Hightlights available"},
			{name: "solarized_light", knownToHl: "solarized-light", title: "Hightlights available"},
			{name: "sqlserver", knownToHl: false, title: "Hightlights unavailable"},
			{name: "terminal", knownToHl: false, title: "Hightlights unavailable"},
			{name: "textmate", knownToHl: false, title: "Hightlights unavailable"},
			{name: "tomorrow", knownToHl: "tomorrow", title: "Hightlights available"},
			{name: "tomorrow_night_blue", knownToHl: "tomorrow-night-blue", title: "Hightlights available"},
			{name: "tomorrow_night_bright", knownToHl: "tomorrow-night-bright", title: "Hightlights available"},
			{name: "tomorrow_night_eighties", knownToHl: "tomorrow-night-eighties", title: "Hightlights available"},
			{name: "tomorrow_night", knownToHl: "tomorrow-night", title: "Hightlights available"},
			{name: "twilight", knownToHl: false, title: "Hightlights unavailable"},
			{name: "vibrant_ink", knownToHl: false, title: "Hightlights unavailable"},
			{name: "xcode", knownToHl: "xcode", title: "Hightlights available"}
			
		];
		
		$scope.getTheme = function (name) {

			return $scope.list.filter(
				theme => {
					return theme.name == name;	
				}
			)[0] || null;
		};

		/* Import */
		$scope.setTheme = function (name) {

			$scope.current = $scope.list.filter(
				theme => {
					return theme.name == name;	
				}
			)[0] || null;

			$scope.page.bg.option_mgr.editor.theme.update($scope.current);
			$scope.$digest();
		};
		
		$scope.current = $scope.getTheme($scope.page.bg.option_mgr.editor.theme.name);
		
		$scope.themeChange = function () {
			
			var link = $scope.current.knownToHl ?
				'<link rel="stylesheet" ng-href="http://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/{{current.knownToHl}}.min.css">' :
				'<link rel="stylesheet" ng-href="../deps/highlightjs/default.min.css">';
			
			$('link')
				.find('[ng-href]')
				.replaceWith($compile(link)($scope));
		};	

	});
	
	this.app.controller('settingsController', function ($scope, $timeout, dataOpts) {
		
		self.settings = $scope;

		$scope.opts = dataOpts;
		$scope.page = self;
		$scope.port = port;
		$scope.title = "Settings";
		
		$scope.submenus = [

			{
				key: 'jsl',
				title: "JSLoader Settings",
				opts: [
					
					new Option({text:'Uglify code', value: $scope.opts.jsl.uglify, type: "checkbox", id: "uglify",								
								subopts: [{text:'Uglify mangle', value: $scope.opts.jsl.uglify_mangle, type: "checkbox", id: "uglify_mangle"}]
							   }, $scope.opts.jsl)
				]
			},
			{
				key: 'editor',
				title: "Editor Settings",
				opts: [
			
					new Option({text:'Print margin line', value: $scope.opts.editor.showPrintMargin, type: "checkbox", id: "showPrintMargin"}, $scope.opts.editor),
					new Option({text:'Collapse header by default', value: $scope.opts.editor.collapsed, type: "checkbox", id: "collapsed"}, $scope.opts.editor),
					new Option({text:'Show gutter line', value: $scope.opts.editor.showGutter, type: "checkbox", id: "showGutter"}, $scope.opts.editor),
					
					new Option({text:'Font size', value: $scope.opts.editor.fontSize, type: "text", id: "fontSize",
								change: that => {

									if (that.ToID)
										clearTimeout(that.ToID);
									
									that.ToID = setTimeout(
										() => {
											$('code').each(
												(i, block) => {
													$(block).css("font-size", $scope.opts.editor.fontSize + "pt");
												}
											);									
										}, 1000
									);
									
								}}, $scope.opts.editor
							  )
				]
			}
		];
		
		$scope.importOpts = function (newVals) {

			$scope.port.postMessage({action: "import-opts", message: newVals});
			
			$scope.page.themes.setTheme(newVals.editor.theme.name);
		};
		
		$scope.settingsFile = function (ev) {
			
			var reader = new FileReader();
			
			reader.onload = function () {
				
				$scope.importOpts(JSON.parse(reader.result));
			}
			
			reader.readAsText(this.files[0]);
		};

		$scope.updtOpts = function() {
			
			//$scope.page.bg.option_mgr.editor.theme.update($scope.page.themes.current);
			$scope.opts.editor.theme = $scope.page.themes.current;
			$scope.page.bg.option_mgr.persist($scope.opts, $scope.page.themes.current); /* !!! */
			
		};
		
		$timeout(
			() => {
				
				$("#import_settings").on('change', $scope.settingsFile);
				
			}
		);
	});

	this.app.controller('domainController', function ($scope, $timeout, dataDomains) {
		
		$scope.page = self;
		$scope.page.domain_list = $scope;
		$scope.port = port;
		$scope.domains = dataDomains;
		
		$scope.shown = [];
		
		$scope.title = "Stored scripts";

		$scope.import_button = false;

		$scope.applyImport = function () {

			var reader = new FileReader();
			
			reader.onload = function () {

				$scope.page.bg.domain_mgr.importDomains(JSON.parse(reader.result));
				$scope.import_button = false;
			}
			
			reader.readAsText($("#import_scripts")[0].files[0]);
		};
		
		$scope.scriptsFile = function (ev) {

			$scope.import_button = true;
			$scope.$digest();
		};
		
		$scope.port.onMessage.addListener(

			(args) => {
				
				switch (args.action) {
					
				case "cache-update-domains":
					
					/* To event emitter. */
					$scope.port.postMessage({action: "list-update", message: args.message});
					$scope.$digest();
					
					break;
				}
			}
		);
		
		$timeout(() => {
			
			$("#import_scripts").on('change', $scope.scriptsFile);
			
		});	
	});
	
	this.app.controller('groupController', function ($scope, $timeout, dataGroups) {

		$scope.page = self;
		$scope.page.group_list = $scope;

		$scope.port = port;
		$scope.groups = dataGroups;

		$scope.shown = [];
		
		$scope.title = "Stored groups";
		
		$scope.import_gr_button = false;
		
		$scope.applyGrImport = function () {

			var reader = new FileReader();
			
			reader.onload = function () {
				
				$scope.page.bg.domain_mgr.importDomains(JSON.parse(reader.result));
				$scope.import_button = false;
			}
			
			reader.readAsText($("#import_groups")[0].files[0]);
		};
		
		$scope.groupsFile = function (ev) {

			$scope.import_gr_button = true;
			$scope.$digest();
		};

		$timeout(() => {
			
			$("#import_groups").on('change', $scope.groupsFile);
			
		});	
	});

	this.app.config(
		$stateProvider => {
			
			$stateProvider.state({
				
				resolve: {
					dataDomains: self.bg.domain_mgr.getAllItems
				},
				
				name: 'domains',
				templateUrl: 'domains.html',
				controller: "domainController"
			});
			
			$stateProvider.state({
				
				resolve: {
					dataOpts: () => { return {editor: self.bg.option_mgr.editor, jsl: self.bg.option_mgr.jsl}; } 
				},
				
				name: 'settings',
				templateUrl: 'settings.html',
				controller: "settingsController"

			});

			$stateProvider.state({
		
				name: 'userdefs',
				templateUrl: 'userdefs.html',
				controller: "userdefsController"
			});

			$stateProvider.state({

				resolve: {
					dataGroups: self.bg.group_mgr.getAllItems
				},
				
				name: 'groups',
				templateUrl: 'groups.html',
				controller: "groupController"
				
			});

			$stateProvider.state({

				resolve: {
					dataStorage: browser.storage.local.get
				},
				
				name: 'storage',
				template: '<div>{{ content }}</div>',

				controller: function ($scope, dataStorage) {

					console.log(dataStorage);
					$scope.content = JSON.stringify(dataStorage);
				}
				
			});
			
		}
	);

	this.app.run($state => {$state.go('domains')});
	
	angular.element(document).ready(
		() => {
			
			angular.bootstrap(document, ['OptionsApp']);
			
		}
	);
}

browser.runtime.getBackgroundPage()
	.then(
		page => {
							
			window.onbeforeunload = function () {
				
				port.disconnect();
							
			}
			
			OP.call(this, page, browser.runtime.connect(browser.runtime.id, {name:"option-page"}));
			
		}
	);		

