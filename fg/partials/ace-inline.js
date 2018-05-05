function AceInline (bg) {

	this.bg = bg;

	this.app = angular.module('InlineAceApp', []);

	this.app.controller('aceInlineController', ($scope, $timeout) => {

		$scope.page = self;

		self.bg.app_events.on("editor-preview",
			opts => {
				
				$scope.setOpts(opts);
				
			}
		);
		
		$scope.setOpts = function (opts) {
			
			console.log("Ace inline: ");
			console.log(opts);
			
			$scope.ace.setPrintMarginColumn(opts.printMarginColumn);
			$scope.ace.renderer.setShowGutter(opts.showGutter);
			$scope.ace.setTheme("ace/theme/" + opts.theme);
			
			$scope.ace.setOptions({
				
				fontSize: opts.fontSize + "pt",
				fontFamily: opts.font
				
			});
		}
		
		$timeout(() => {
			
			$scope.ace = ace.edit("code_area");
			$scope.ace.session.setMode("ace/mode/javascript");
			
			$scope.setOpts($scope.page.bg.option_mgr.editor);
			
		});
	});
	
	angular.element(document).ready(
		() => {
			
			angular.bootstrap(document, ['InlineAceApp']);
			
		}
	);	
}

browser.runtime.getBackgroundPage()
	.then(
		page => {
			
			AceInline.call(this, page);
		}
	);
