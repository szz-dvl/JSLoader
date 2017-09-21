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

function OP (bg, domains, port) {
	
	var self = this;
	
	this.bg = bg;
	
	this.domain_list;
	this.themes;
	this.settings;
	
	this.app = angular.module('OptionsApp', ['jslPartials', 'td.tabs']);

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
	
	this.app.controller('settingsController', ($scope, $timeout) => {

		self.settings = $scope;
		
		$scope.page = self;
		$scope.port = port;
		
		$scope.title = "Settings";
		
		$scope.submenus = [

			{
				key: 'jsl',
				title: "JSLoader Settings",
				opts: [
					
					new Option({text:'Uglify code', value: $scope.page.bg.option_mgr.jsl.uglify, type: "checkbox", id: "uglify",								
								subopts: [{text:'Uglify mangle', value: $scope.page.bg.option_mgr.jsl.uglify_mangle, type: "checkbox", id: "uglify_mangle"}]
							   }, $scope.page.bg.option_mgr.jsl)
				]
			},
			{
				key: 'editor',
				title: "Editor Settings",
				opts: [
			
					new Option({text:'Print margin line', value: $scope.page.bg.option_mgr.editor.showPrintMargin, type: "checkbox", id: "showPrintMargin"}, $scope.page.bg.option_mgr.editor),
					new Option({text:'Collapse header by default', value: $scope.page.bg.option_mgr.editor.collapsed, type: "checkbox", id: "collapsed"}, $scope.page.bg.option_mgr.editor),
					new Option({text:'Show gutter line', value: $scope.page.bg.option_mgr.editor.showGutter, type: "checkbox", id: "showGutter"}, $scope.page.bg.option_mgr.editor),
					
					new Option({text:'Font size', value: $scope.page.bg.option_mgr.editor.fontSize, type: "text", id: "fontSize",
								change: that => {

									if (that.ToID)
										clearTimeout(that.ToID);
									
									that.ToID = setTimeout(
										() => {
											$('code').each(
												(i, block) => {
													$(block).css("font-size", $scope.page.bg.option_mgr.editor.fontSize + "pt");
												}
											);									
										}, 1000
									);
									
								}}, $scope.page.bg.option_mgr.editor
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
			
			$scope.page.bg.option_mgr.editor.theme.update($scope.page.themes.current);
			$scope.page.bg.option_mgr.persist();
			
		};
		
		$timeout(
			() => {
				
				$("#import_settings").on('change', $scope.settingsFile);
				
			}
		);
	});

	this.app.controller('domainController', ($scope, $timeout) => {

		$scope.page = self;
		$scope.page.domain_list = $scope;
		$scope.port = port;
		$scope.domains = domains;
		
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
					
				case "cache-update":
					
					$scope.$digest();
					//console.log("cache-update for: " + args.message);
					$scope.port.postMessage({action: "list-update", message: args.message});
					
					break;
				}
			}
		);

		$timeout(() => {
			
			$("#import_scripts").on('change', $scope.scriptsFile);
			
		});	
	});
	
	angular.element(document).ready(
		() => {
			
			angular.bootstrap(document, ['OptionsApp']);
			
		}
	);
}


browser.runtime.getBackgroundPage()
	.then(
		page => {
			page.getOptPage()
				.then(
					domains => {

						var port = browser.runtime.connect(browser.runtime.id, {name:"option-page"});

						window.onbeforeunload = function () {

							// console.log("OnBeforeUnload Editor: ");
							// console.log(this.bg.option_mgr);
							// console.log(this.bg.option_mgr.editor);
							
							port.disconnect();
							
						}

						OP.call(this, page, domains, port);
					}
				);		
		}
	);
	
