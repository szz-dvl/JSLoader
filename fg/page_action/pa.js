function PA (bg, site) {

	var self = this;

	this.bg = bg;
	this.site = site;

	console.log("My site!");
	console.log(this.site);
	
	this.app = angular.module('pageActionApp', ['jslScriptList']); /*'jslScriptList'*/

	this.app.controller('headController', $scope => {
		
		$scope.page = self;
		
	});

	this.app.controller('siteController', $scope => {
		
		$scope.page = self;
		$scope.site = self.site;
		
	});

	self.bg.app.pa.onMessage.addListener(
		args => {

			console.log("PA received: ");
			console.log(args);
		}
	);
	
	angular.element(document).ready(
		() => {
			
			angular.bootstrap(document, ['pageActionApp']);
		}
	);

}

browser.runtime.getBackgroundPage()
	.then(
		page => {

			page.bg_manager.app.pa = browser.runtime.connect({name:"page-action"});

			page.bg_manager.getPASite()
				.then(
					site => {
						
						new PA(page.bg_manager, site);

						window.onbeforeunload = function () {

							page.bg_manager.app.pa.disconnect();
							page.bg_manager.app.pa = null;
							
						}
					}
				);						
		}
	);
