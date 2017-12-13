function AceInline (bg) {

	this.bg = bg;

	this.app = angular.module('InlineAceApp', []);

	this.app.controller('aceInlineController', ($scope, $timeout) => {

		$scope.page = self;
		$scope.key = window.location.href.split("?")[1].split("=")[1];
		
		$scope.feeding = $scope.key == "defs" ? $scope.page.bg.content_mgr[$scope.key] : JSON.stringify($scope.key == "globals" ? $scope.page.bg.content_mgr[$scope.key] : $scope.page.bg.option_mgr.jsl[$scope.key]);
		$scope.mode = $scope.key == "defs" ? "javascript" : "json";
		
		$scope.saveData = function () {
			
			let errors = $scope.ace.getSession().getAnnotations()
				.filter(
					annotation => {

						return annotation.type == 'error';
						
					}
				);
			
			if (errors.length) {
				
				let error = errors[0];
				
				self.bg.notify_mgr.error("Script Errors: Please check your syntax.");
				$scope.ace.gotoLine(error.row + 1, error.column, true);
				
			} else {		

				switch($scope.key) {
				case "defs":
					
					$scope.page.bg.content_mgr.setUserDefs($scope.ace.getValue().toString().trim());
					break;
					
				case "globals":
					
					$scope.page.bg.content_mgr.setGlobals($scope.ace.getValue().toString().trim());
					break;

				case "proxys":
					
					$scope.page.bg.option_mgr.setProxys($scope.ace.getValue().toString().trim());
					break;
					
				default:
					break;
				}
			}

		};
		
		$timeout(() => {

			$("#code_area").text($scope.feeding);

			$scope.ace = ace.edit("code_area");
			$scope.ace.session.setMode("ace/mode/" + $scope.mode);
			$scope.ace.setShowPrintMargin($scope.page.bg.option_mgr.editor.showPrintMargin);
			$scope.ace.renderer.setShowGutter($scope.page.bg.option_mgr.editor.showGutter);
			$scope.ace.setTheme("ace/theme/" + $scope.page.bg.option_mgr.editor.theme.name);
			
			$scope.ace.setOptions({
				
				fontSize: $scope.page.bg.option_mgr.editor.fontSize + "pt"
				
			});

			$scope.ace.commands.addCommand({
				name: 'save',
				bindKey: {win: 'Ctrl-S', mac: 'Command-Option-S'},
				
				exec: function() {
					$scope.saveData();
				}
			});
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
