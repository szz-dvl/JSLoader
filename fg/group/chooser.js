function GroupChooser (bg) {

	var self = this;
	
	this.bg = bg;
	this.form;

	this.app = angular.module('ChooserApp', []);

	this.app.controller('formController', ($scope, $timeout) => {

		self.form = $scope;
		$scope.groups = self.bg.group_mgr.groups;

		$scope.action;
		
		$scope.current = $scope.groups[0];
		$scope.url = self.bg.group_mgr.adding.name();
		$scope.backup = self.bg.group_mgr.adding;

		$scope.setAction = function () {
			
			console.log("Current group: " + $scope.current);
			
			self.bg.group_mgr.getOrBringCached($scope.current)
				.then(
					group => {
						
						if (group.haveSite($scope.url))
							$scope.action = "Remov";
						else
							$scope.action = "Add";

						console.log("Setting action: " + $scope.action);
						
						$scope.$digest();
					}
				)
		};
		
		$scope.isSubDomain = function (orig, modified) {

			var mod_arr = modified.split(".");
			var orig_arr = orig.split(".");
			
			var cursor_mod = mod_arr.length - 1;
			var cursor_orig = orig_arr.length - 1;

			while ( (mod_arr[cursor_mod] != "*") &&
					(mod_arr[cursor_mod] == orig_arr[cursor_orig])
				  ) {

				cursor_mod --;
				cursor_orig --;	
			}

			return mod_arr[cursor_mod] == "*";
		};
		
		$scope.validateSite = function () {
			
			if($scope.changeID)
				clearTimeout($scope.changeID);
			
			$("#submit_btn").attr("disabled", true);
			
			$scope.changeID = setTimeout(
				() => {
					
					try {
						
						var temp = new URL("http://" + $scope.url);

						if (temp.hostname != $scope.backup.hostname)
							$scope.url = $scope.backup.name();	
						else
							$scope.backup = temp;
							
					} catch (e if e instanceof TypeError) {

						if ($scope.url.indexOf("*") != 0) 
							$scope.url = $scope.backup.name();
						else {

							if ($scope.isSubDomain($scope.backup.hostname, $scope.url.split("/")[0])) {

								$scope.url = $scope.url.split("/")[0]; /* "All subdomains" shortcut ... */
								
							} else
								$scope.url = $scope.backup.name();
						}
					}

					$scope.setAction();
					
					$("#submit_btn").removeAttr("disabled");
					$("#site_validator").blur();
					$("#site_validator").focus();
					
				}, 300);
		};
		
		$scope.addSite = function () {
			
			if ($scope.action == "Add") 	
				self.bg.group_mgr.addSiteTo($scope.current, $scope.url);
			else
				self.bg.group_mgr.removeSiteFrom($scope.current, $scope.url);
			
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

				var oldX = window.screenX,
					oldY = window.screenY;

				setTimeout(
					() => {

						//window.close();
						if (window.screenX == oldX || window.screenY == oldY)
							 console.warn("Close chooser!!")
						
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
