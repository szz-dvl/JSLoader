function Option (opt, page) {

	var self = this;
	
	this.text = opt.text || "";
	this.type = opt.type || "checkbox";
	this.id = opt.id || null;
	this.value = opt.value || null;

	this.__onChange = opt.change || null; 

	this.change = function () {

		page.bg.option_mgr.editor[self.id] = self.value;

		if (self.__onChange)
			self.__onChange();

	}
	
}


function OP (bg, domains, port) {
	
	var self = this;
	
	this.bg = bg;
	
	this.editor;
	this.domain_list;
	this.themes;
	
	this.app = angular.module('OptionsApp', ['jslPartials']);

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
	
	this.app.controller('editorController', $scope => {
		
		self.editor = $scope;
		$scope.page = self;
		
		$scope.title = "Editor settings";
		
		$scope.opts = [
			
			new Option({text:'Print margin line', value: $scope.page.bg.option_mgr.editor.showPrintMargin, type: "checkbox", id: "showPrintMargin"}, $scope.page),
			new Option({text:'Collapse header by default', value: $scope.page.bg.option_mgr.editor.collapsed, type: "checkbox", id: "collapsed"}, $scope.page),
			new Option({text:'Show gutter line', value: $scope.page.bg.option_mgr.editor.showGutter, type: "checkbox", id: "showGutter",
						change: () => {
							console.log($scope.page.bg.option_mgr.editor);
						}}, $scope.page
					  ),
			new Option({text:'Font size', value: $scope.page.bg.option_mgr.editor.fontSize, type: "text", id: "fontSize",
						change: ()  => {
							$('code').each(
								(i, block) => {
									$(block).css("font-size", $scope.page.bg.option_mgr.editor.fontSize + "pt");
								}
							);
						}}, $scope.page 
					  )
		];

		// $scope.getOptVal = function (id) {

		// 	return $scope.opts.filter(
		// 		opt => {

		// 			return opt.id == id;
					
		// 		}
		// 	)[0] || null;

		// };
		
		$scope.updtOpts = function() {

			console.log($scope.page.bg.option_mgr.editor);

			
			
			
			$scope.page.bg.option_mgr.editor.theme = new Theme ($scope.page.themes.current);
			
			// Object.assign($scope.page.bg.option_mgr.editor.theme, $scope.page.themes.current);
			$scope.page.bg.option_mgr.persist();
		};
		
	});

	this.app.controller('domainController', ($scope, $timeout) => {

		$scope.page = self;
		$scope.page.domain_list = $scope;
		$scope.port = port;
		$scope.domains = domains;
		
		$scope.shown = [];
		
		$scope.title = "Stored scripts";

		// $scope.digest_cnt = 0;

		// $scope.$watch('digest_cnt', function(newValue, oldValue) {

		// 	$scope.digest_cnt ++;

		// 	if (newValue !== oldValue)
		// 		$scope.port.postMessage({action: "list-update", message: "caca de la vaca"});
			
		// });
		
		// $scope.findScript = function (uuid) {

		// 	for (domain of $scope.domains) {

		// 		var script = domain.haveScript(uuid);
				
		// 		if (script)
		// 			return script;

		// 	}

		// 	return null;
		// }
		
		$timeout(() => {

			$('code').each(
				(i, block) => {
					$(block).css("font-size", $scope.page.bg.option_mgr.editor.fontSize + "pt");
				}
			);
		});
		
		$scope.port.onMessage.addListener(

			(args) => {

				switch (args.action) {
					
				case "update-page":

					console.log("update-page");
					$scope.$digest();
					//console.log("cache-update for: " + args.message + ", ");
					// console.log($scope.port);
					
					//$scope.port.postMessage({action: "list-update", message: args.message});

					//$scope.port.postMessage({action: "list-update", message: args.message});
					
					break;
				}
			}
		);
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

							port.disconnect();
							
						}

						OP.call(this, page, domains, port);
					}
				);		
		}
	);
	
