
function AceInline (bg) {

	this.bg = bg;

	this.app = angular.module('InlineAceApp', []);

	this.app.controller('aceInlineController', ($scope, $timeout) => {

		$scope.page = self;
		$scope.key = window.location.href.split("?")[1].split("=")[1];
		
		$scope.feeding = $scope.key == "globals" ? JSON.stringify($scope.page.bg.content_mgr[$scope.key]) : $scope.page.bg.content_mgr[$scope.key];
		$scope.mode = $scope.key == "defs" ? "javascript" : "json";
		
		$scope.saveData = function () {
			
			let errors = $scope.ace.getSession().getAnnotations()
				.filter(
					annotation => {

						return annotation.type == 'error';
						
					}
				);
			
			if (errors.length) {
				
				console.log("Errors for " + $scope.key);
				console.log(errors);
				
				/* Notify */
				
			} else {		

				switch($scope.key) {
				case "defs":
					
					$scope.page.bg.content_mgr.setUserDefs($scope.ace.getValue().toString().trim());
					break;
					
				case "globals":
					
					$scope.page.bg.content_mgr.setGlobals($scope.ace.getValue().toString().trim());
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
