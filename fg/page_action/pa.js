function PA (bg, info) {

	var self = this;

	this.bg = bg;
	this.info = info;
	
	this.app = angular.module('pageActionApp', ['jslPartials', 'ui.router']);
	
	this.app.controller('headController', $scope => {
		
		$scope.page = self;
		
	});

	this.app.controller('siteController', $scope => {
		
		$scope.page = self;
		$scope.info = self.info;
		
		$scope.shown = [];
		
	});

	this.app.config(
		$stateProvider=> {
		
			$stateProvider.state('pa-site', {

				views: {
					'domain': {
						
						templateUrl: 'lists.html',
						controller: function ($scope) {

							$scope.page = self;
							$scope.data = self.info.domain;
							
						}
					},
					
					'site': {
						
						templateUrl: 'lists.html',
						controller: function ($scope) {

							$scope.page = self;
							$scope.data = self.info.site;
							
						}
					},
					
					'groups': {
						
						templateUrl: 'lists.html',
						controller: function ($scope) {

							$scope.page = self;
							$scope.data = self.info.groups;
							
						}
					},

					'subdomains': {
						
						templateUrl: 'lists.html',
						controller: function ($scope) {

							$scope.page = self;
							$scope.data = self.info.subdomains;

						}
					}

				}	
			});
		});

	this.app.run($state => { $state.go('pa-site') });
	
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
					info => {

						console.log(info);
						PA.call(this, page, info);
						
					}
				);						
		}
	);
