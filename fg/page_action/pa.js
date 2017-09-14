function PA (bg, site) {

	var self = this;

	this.bg = bg;
	this.site = site;
	
	this.app = angular.module('pageActionApp', ['jslPartials']); /*'jslScriptList'*/
	
	this.app.controller('headController', $scope => {
		
		$scope.page = self;
		
	});

	this.app.controller('siteController', $scope => {
		
		$scope.page = self;
		$scope.site = self.site;
		
	});
	
	angular.element(document).ready(
		() => {
			
			angular.bootstrap(document, ['pageActionApp']);
		}
	);

}

browser.runtime.getBackgroundPage()
	.then(
		page => {
			page.getPASite()
				.then(
					site => {
						
						PA.call(this, page, site);
						
					}
				);						
		}
	);
