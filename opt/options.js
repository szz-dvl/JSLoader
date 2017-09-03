function OP () {
	
	var self = this;
	
	this.__gutterInit;
	this.editor;
	this.scripts;
	
	this.editorController = function ($scope) {
		
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
		
		$scope.boolOpts = [
			{text:'Print margin line', value: self.data.opts.editor.showPrintMargin, id: "showPrintMargin"},
			{text:'Collapse header by default', value: self.data.opts.editor.collapsed, id: "collapsed"},
			{text:'Show gutter line', value: self.data.opts.editor.showGutter, id: "showGutter"}
		];

		$scope.textOpts = [
			{text:'Font size', value: self.data.opts.editor.fontSize, type: "text", id: "fontSize"}
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

			self.bg.storeOptions(ret);
		};
		
	});

	this.scriptsController = function ($scope) {

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
			
			self.bg.editScriptFor(id, $(ev.target).data("domain"));
			
		};
		
		$scope.removeScript = function(ev) {
					
			var id = ev.target.id.split("_").pop();
			var domain_name = $(ev.target).data("domain");
		
			var domain = $scope.domains.filter((domain, pos) => {
				return domain.name == domain_name;
			})[0];

			var script = domain.findScript(id);
	
			if(!script.remove()) {
					
				domain.persist();
				
			} else {

				$scope.domains.remove($scope.domains.findIndex(domain => {
					
					return domain.name == domain_name;
					
				}));
			}
		};

		$scope.highLightCode = function() {
			
			$('code').each(function(i, block) {			
				hljs.highlightBlock(block);
				
				if (self.opts.showGutter) {
					
					hljs.lineNumbersBlock(block);
					self.__gutterInit = true;
				}
				
			});
			
			$('code').css("font-size", self.opts.fontSize + "pt");
		};
		
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

				self.opts = response.message;
				break;
				
			case "script":

				//$("#" + response.message.uuid).find("code").text(response.message.literal);
				self.scripts.domains.findScript(response.message.uuid).code = response.message.literal;
				break;
				
			default:
				break;
		}
	};

	/* Init */
	browser.runtime.getBackgroundPage().then(page => {
		
		self.bg = page.bg_manager;
		
		self.bg.getOptPage().then(info => {
			
			angular.element(document).ready( () => {
				
				self.opts = info.opts.editor;
				self.data = info;
				
				/* self.bg.app.constant('data', {opts: info.opts, domains: info.domains}); */
				self.bg.app.controller('scriptsController', self.scriptsController);
				self.bg.app.controller('editorController', self.editorController);
				
				angular.bootstrap(document, ['JSLoaderApp']);
				
			});
		});
	});
}

var options_page = new OP();

browser.runtime.onMessage.addListener(options_page.newSettings);
