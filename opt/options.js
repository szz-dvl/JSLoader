function OP () {

	var self = this;
	
	this.app = angular.module('optionsApp', []);
	this.editor;
	this.scripts;

	this.app.controller('editorController', ($scope, data) => {

		self.editor = $scope;
		$scope.bg = data.bg;
		
		$scope.title = "Editor settings";
		$scope.themes = [
			"ambiance",
			"chaos",
			"chrome",
			"clouds",
			"clouds_midnight",
			"cobalt",
			"crimson_editor",
			"dawn",
			"dreamweaver",
			"eclipse",
			"github",
			"gob",
			"gruvbox",
			"idle_fingers",
			"iplastic",
			"katzenmilch",
			"kr_theme",
			"kuroir",
			"merbivore",
			"merbivore_soft",
			"mono_industrial",
			"monokai",
			"pastel_on_dark",
			"solarized_dark",
			"solarized_light",
			"sqlserver",
			"terminal",
			"textmate",
			"tomorrow",
			"tomorrow_night_blue",
			"tomorrow_night_bright",
			"tomorrow_night_eighties",
			"tomorrow_night",
			"twilight",
			"vibrant_ink",
			"xcode"];
		
		$scope.currTheme = data.opts.editor.theme;
		
		$scope.boolOpts = [
			{text:'Print margin line', value: data.opts.editor.showPrintMargin, id: "showPrintMargin"},
			{text:'Collapse header by default', value: data.opts.editor.collapsed, id: "collapsed"},
			{text:'Show gutter line', value: data.opts.editor.showGutter, id: "showGutter"}
		];

		$scope.textOpts = [
			{text:'Font size', value: data.opts.editor.fontSize, type: "text", id: "fontSize"}
		];
		
		$scope.updtOpts = function() {
			
			var ret = {editor: {}};
			
			angular.forEach($scope.boolOpts, opt => {
				ret.editor[opt.id] = opt.value;
			});

			angular.forEach($scope.textOpts, opt => {
				ret.editor[opt.id] = opt.value;
			});

			ret.editor.theme = $scope.currTheme;

			$scope.bg.storeOptions(ret);
		};
		
	});

	this.app.controller('scriptsController', ($scope, data) => {

		self.scripts = $scope;
		
		$scope.bg = data.bg;
		$scope.domains = data.domains;
		$scope.opts = data.opts.editor;
		$scope.title = "Stored scripts"
		$scope.__gutterInit;
		
		$scope.clickSite = function (ev) {

			var elem;
			
			if (ev.target.tagName == "LI")
				elem = $(ev.target);
			else
				elem = $(ev.target).parent();
	
			if (elem.hasClass("info-shown")) {

				elem.children(".script-list").find(".hidden-elem").hide();
				elem.removeClass("info-shown");
				
			} else {
				
				elem.children(".script-list").find(".hidden-elem").show();
				elem.addClass("info-shown");
				
			}
			
		};

		$scope.clickScript = function(ev) {

			var elem;
			
			if (ev.target.tagName == "LI")
				elem = $(ev.target);
			else
				elem = $(ev.target).parent();
			
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
			
			//console.log("Editing " + id);
			$scope.bg.editScriptFor(id, $(ev.target).data("domain"));
			
		};
		
		$scope.removeScript = function(ev) {
			
			var id = ev.target.id.split("_").pop();
			
			/* console.log("Removing " + id); */
			
			$scope.bg.removeScriptFor(id, $(ev.target).data("domain"));
			$("#" + id).parent().remove();
		};

		$scope.highLightCode = function() {

			
			$('code').each(function(i, block) {			
				hljs.highlightBlock(block);
				
				if ($scope.opts.showGutter) {
					
					hljs.lineNumbersBlock(block);
					$scope.__gutterInit = true;
				}
				
			});
			
			$('code').css("font-size", $scope.opts.fontSize + "pt");
		};
		
	});

	this.newSettings = function(response) {

		if (response.action == "opts") {
			
			console.log("New settings: ");
			console.log(response.message);
			
			$('code').css("font-size", response.message.fontSize + "pt");
			
			if (response.message.showGutter) {

				if (self.scripts.__gutterInit) {
					
					$(".hljs-ln-numbers").show();
					
				} else {


					$('code').each(function(i, block) {
						hljs.lineNumbersBlock(block);
					});
					

					self.scripts.__gutterInit = true;
				}
				
			} else {
				
				$(".hljs-ln-numbers").hide();

			}

			self.scripts.opts = response.message;
		}
	};

	/* Init */
	browser.runtime.getBackgroundPage().then(page => {
		
		var bg = page.bg_manager;
		
		bg.getOptPage().then(info => {
			
			angular.element(document).ready( () => {
				
				self.app.constant('data', {bg: bg, opts: info.opts, domains: info.domains});
				
				angular.bootstrap(document, ['optionsApp']);
				
			});
		});
	});
}

var options_page = new OP();

browser.runtime.onMessage.addListener(options_page.newSettings);
