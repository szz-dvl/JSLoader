function OP (bg, info) {
	
	var self = this;
	
	this.data = info;
	this.bg = bg;
	
	this.editor;
	this.scripts;
	this.themes;

	console.log(self.data.opts);
	
	this.app = angular.module('OptionsApp', ['hljsSearch']);

	this.app.controller('themeController', ($scope, $compile) => {

		self.themes = $scope;
		
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
		
		$scope.current = $scope.getTheme(self.data.opts.editor.theme);

		$scope.themeChange = function () {

			var to_remove = $('link').find('[ng-href]');
			var parent = to_remove.parent();
			
			to_remove.remove();

			var link = $scope.current.knownToHl ?
				'<link rel="stylesheet" ng-href="http://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/{{current.knownToHl}}.min.css">' :
				'<link rel="stylesheet" ng-href="../deps/highlightjs/default.min.css">';
			
			parent.prepend($compile(link)($scope));
		};
		
	});
	
	this.app.controller('editorController', $scope => {
		
		self.editor = $scope;
		$scope.page = self;
		
		$scope.title = "Editor settings";
		
		$scope.opts = [

			{text:'Print margin line', value: self.data.opts.editor.showPrintMargin, type: "checkbox", id: "showPrintMargin"},
			{text:'Collapse header by default', value: self.data.opts.editor.collapsed, type: "checkbox", id: "collapsed"},
			{text:'Show gutter line', value: self.data.opts.editor.showGutter, type: "checkbox", id: "showGutter"},
			{text:'Font size', value: self.data.opts.editor.fontSize, type: "text", id: "fontSize",
			 change: ()  => {
				 $('code').each(
					 (i, block) => {
						 $(block).css("font-size", $scope.getOptVal('fontSize') + "pt");
					 }
				 );
			 }}
		];
		
		$scope.getOptVal = function (key) {
			
			return $scope.opts.filter(
				opt => {
					return opt.id == key;	
				}
			)[0].value || null;
		};
		
		$scope.updtOpts = function() {
			
			var ret = {};
			
			$scope.opts.forEach(
				opt => {
					ret[opt.id] = opt.value; 	
				}
			);
			
			ret.theme = $scope.page.themes.current.name;
			
			return self.bg.option_mgr.setCurrentEditor(ret);
		};
		
	});

	this.app.controller('scriptsController', ($scope, $timeout) => {

		self.scripts = $scope;
		
		$scope.domains = self.data.domains;
		
		$scope.title = "Stored scripts";
		
		$scope.clickSite = function (ev) {
			
			var elem = $(ev.currentTarget).parent();
			
			if (elem.hasClass("info-shown")) {
				
				elem.children(".script-list").find(".hidden-elem").hide();
				elem.removeClass("info-shown");
				
			} else {
				
				elem.children(".script-list").find(".hidden-elem").show();
				elem.addClass("info-shown");
				
			}
			
		};
		
		$scope.clickScript = function (ev) {

			var elem = $(ev.currentTarget).parent() || ev;
			
			if (elem.hasClass("script-shown")) {

				elem.find(".hidden-script").hide();
				elem.removeClass("script-shown");
				
			} else {
				
				elem.find(".hidden-script").show();
				elem.addClass("script-shown");
			}
			
		};
		
		$scope.editScript = function(ev) {
			
			var id = ev.target.id.split("_").pop();
			var domain_name = $(ev.target).data("domain");
			
			var domain = $scope.domains.filter(
				domain => {
					return domain.name == domain_name;
				})[0];
			
			self.bg.editor_mgr.openEditorInstanceForScript(domain.haveScript(id));
			
		};
		
		$scope.removeScript = function(ev) {
					
			var id = ev.target.id.split("_").pop();
			var domain_name = $(ev.target).data("domain");

			console.log("Removing script for: " + domain_name);
			
			$scope.domains.filter(
				domain => {

					return domain.name == domain_name;
					
				})[0].haveScript(id).remove();
			
		};

		$timeout(() => {

			$('code').each(
				(i, block) => {
					$(block).css("font-size", self.editor.getOptVal('fontSize') + "pt");
				}
			);
		});
		
	});

	this.scriptChange = function () {
		
		/* 
		   Underlying structures already updated by editor, need to trigger $scope.$digest() to re-render data however ...
		   ?? => scriptsController not aware of changes made in other pages, even for the same "object"??
		*/
		
		self.scripts.$digest();
		
	};
	
	angular.element(document).ready(
		() => {
			
			angular.bootstrap(document, ['OptionsApp']);
		}
	);
}

browser.runtime.getBackgroundPage()
		.then(
			page => {
				page.bg_manager.getOptPage()
					.then(
						info => {
							
							page.bg_manager.app.op = new OP(page.bg_manager, info);

							window.onbeforeunload = function () {
								page.bg_manager.app.op = null;
							}
						}
					);
			}
		);

