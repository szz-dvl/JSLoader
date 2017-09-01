var app = angular.module('optionsApp', []);

browser.runtime.getBackgroundPage().then(page => {
	
	var bg = page.bg_manager;
		
	bg.getOptPage().then(info => {
		
		angular.element(document).ready( () => {

			app.constant('data', {bg: bg, opts: info.opts, domains: info.domains});
			
			angular.bootstrap(document, ['optionsApp']);
			
		});
	});
});

app.controller('editorController', ($scope, data) => {
	
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
		{text:'Font size', value: data.opts.editor.fontSize, type: "text"}
	];
	
	$scope.updtOpts = function() {

		var ret = {editor: {}};
		
		angular.forEach($scope.boolOpts, opt => {
			ret.editor[opt.id] = opt.value;
		});

		ret.editor.fontSize = $scope.textOpts[0].value;
		ret.editor.theme = $scope.currTheme;

		$scope.bg.storeOptions(ret);
	};
	
});

app.controller('scriptsController', ($scope, data) => {

	hljs.initHighlightingOnLoad();
	
	$scope.bg = data.bg;
	$scope.domains = data.domains;

	$scope.title = "Stored scripts"

	$scope.clickSite = function (ev) {

		var elem;

		console.log("Site click!");
		
		if (ev.target.tagName == "LI")
			elem = $(ev.target);
		else
			elem = $(ev.target).parent();

		console.log(elem);
		
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

		console.log(elem);
		
		if (elem.hasClass("script-shown")) {

			elem.find(".hidden-script").hide();
			elem.removeClass("script-shown");
			
		} else {
			
			elem.find(".hidden-script").show();
			elem.addClass("script-shown");
			
		}
	};

	$scope.highLightCode = function() {
		
		$('pre code').each(function(i, block) {			
			hljs.highlightBlock(block);
		});
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
});
