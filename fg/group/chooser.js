function GroupChooser (bg) {

	var self = this;
	
	this.bg = bg;
	this.form;

	this.app = angular.module('ChooserApp', ['jslPartials']);
	
	this.app.controller('formController', ($scope, $timeout) => {
		
		self.form = $scope;
		$scope.groups = self.bg.group_mgr.groups;
		
		$scope.events = new EventEmitter();
		$scope.action;
		
		$scope.current = $scope.groups[0];
		$scope.url = self.bg.group_mgr.adding.name();

		$scope.setAction = function () {
			
			self.bg.group_mgr.getOrBringCached($scope.current)
				.then(
					group => {

						if (group.ownerOf($scope.url))
							$scope.action = "Remove";
						else
							$scope.action = "Add";

						//$("#site_validator").blur();
						//$("#site_validator").focus();
						
						$scope.$digest();
					}
				)
		};
		
		$scope.events
			.on('validation_start',
				pending => {

					console.log("Validation start: " + pending);
								
					$("#submit_btn").attr("disabled", true);
					
				})
		
			.on('validation_ready',
				validated => {

					$scope.url = validated;
					$scope.setAction();

					console.log("Validated url: " + validated);
					
					$("#submit_btn").removeAttr("disabled");
					
				});
		
		$scope.addSite = function () {
			
			if ($scope.action == "Add") 	
				self.bg.group_mgr.addSiteTo($scope.current, $scope.url);
			else
				self.bg.group_mgr.removeSiteFrom($scope.current, $scope.url);
			
			window.close();
		};
		
		$timeout(
			() => {
				
				$scope.setAction();
			}
		);
	});
	
	angular.element(document).ready(
		() => {
			
			window.onblur = function () {

				console.log(window);

				var oldX = window.screenX,
					oldY = window.screenY;
				
				setTimeout(
					() => {
						
						if (oldX == window.screenX || oldY == window.screenY)
							window.close();
							
					}, 50);		
			}
			
			angular.bootstrap(document, ['ChooserApp']);
		}
	);
}

browser.runtime.getBackgroundPage()
	.then(
		page => {
			GroupChooser.call(this, page);
		}
	);
