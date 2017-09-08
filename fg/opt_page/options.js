function Option (opt) {

	var self = this;

	this.text = opt.text;
	this.value = opt.value;
	this.id = opt.id;

	

}


function OP (bg, info) {
	
	var self = this;
	
	this.__gutterInit;
	this.data = info;
	this.bg = bg;
	
	this.editor;
	this.scripts;
	
	this.app = angular.module('OptionsApp', []);

	this.app.controller('editorController', function ($scope) {
		
		self.editor = $scope;
		
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
		
		$scope.currTheme = self.data.opts.editor.theme;

		$scope.opts = [

			{text:'Print margin line', value: self.data.opts.editor.showPrintMargin, type: "checkbox", id: "showPrintMargin"},
			{text:'Collapse header by default', value: self.data.opts.editor.collapsed, type: "checkbox", id: "collapsed"},
			{text:'Show gutter line', value: self.data.opts.editor.showGutter, type: "checkbox", id: "showGutter"},
			{text:'Font size', value: self.data.opts.editor.fontSize, type: "text", id: "fontSize"}
			
		];
		
		$scope.updtOpts = function() {
			
			var ret = $scope.opts.map(opt => {
				
				var aux = {};

				aux[opt.id] = opt.value; 

				return aux;
				
			});
			
			ret.editor.theme = $scope.currTheme;
			
			self.bg.option_mgr.setCurrentEditor(ret);
		};
		
	});

	this.app.controller('scriptsController', function ($scope, $interpolate, $timeout) {

		self.scripts = $scope;
		
		$scope.domains = self.data.domains;
		$scope.title = "Stored scripts"
		
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

		$scope.clickScript = function(ev) {

			var elem = $(ev.currentTarget).parent();
			
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


		/* After interpolation ready ... */
		$timeout(function () {
			
			$('code').each(function(i, block) {			
				hljs.highlightBlock(block);
				
				if (self.data.opts.editor.showGutter) {
					
					hljs.lineNumbersBlock(block);
					self.__gutterInit = true;
				}
				
			});
			
			$('code').css("font-size", self.data.opts.editor.fontSize + "pt");
			
		});
		
	});

	this.newSettings = function(response) {
		
		switch (response.action) {
			
		case "opts":
			
			$('code').css("font-size", response.message.fontSize + "pt");
			
			if (response.message.showGutter) {
				
				if (self.__gutterInit) {
					
					$(".hljs-ln-numbers").show();
					
				} else {
					
					
					$('code').each(function(i, block) {
						hljs.lineNumbersBlock(block);
					});
					

					self.__gutterInit = true;
				}
				
			} else {
				
				$(".hljs-ln-numbers").hide();
				
			}

			self.data.opts.editor = response.message;
			break;
			
		case "script":

			$("#" + response.message.uuid).find("code").text(response.message.literal);
			//self.scripts.domains.haveScript(response.message.uuid).code = response.message.literal;
			break;
				
		default:
			break;
		}
	};

	
	this.scriptChange = function (domain_name, uuid) {

		var script = self.scripts.domains.filter(
			domain => {
				
				return domain.name == domain_name;
				
			})[0].haveScript(uuid);

		var elem = $("#" + uuid);

		console.log(elem);
		
		elem.find("code").text(script.code);
		elem.find("code").each(function (i, block) {
			
			hljs.highlightBlock(block);
			
			if (self.data.opts.editor.showGutter) 
				hljs.lineNumbersBlock(block);
			
		});
		
		console.log("Script change: ");
		console.log(script);	
		
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
							browser.runtime.onMessage.addListener(page.bg_manager.app.op.newSettings);
							
						});
			});

