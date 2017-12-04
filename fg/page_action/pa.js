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

							$scope.key = "domain";
							
							$scope.page = self;
							$scope.data = self.info.domain.map(
								domain => {

									domain.visible = false;
									domain.toggleList = function () {
										domain.visible = !domain.visible;
									}

									domain.listState = function () {
										return domain.visible ? "v" : ">";
									}

									return domain;
								}
							);
							
						}
					},
					
					'site': {
						
						templateUrl: 'lists.html',
						controller: function ($scope) {

							$scope.key = "site";
							
							$scope.page = self;
							$scope.data = self.info.site.map(
								site => {

									site.visible = false;
									site.toggleList = function () {
										site.visible = !site.visible;
									}

									site.listState = function () {
										return site.visible ? "v" : ">";
									}

									return site;
								}
							);
							
						}
					},
					
					'groups': {
						
						templateUrl: 'lists.html',
						controller: function ($scope) {

							$scope.key = "group";
							
							$scope.page = self;
							$scope.data = self.info.groups.map(
								group => {

									group.visible = false;
									group.toggleList = function () {
										group.visible = !group.visible;
									}

									group.listState = function () {
										return group.visible ? "v" : ">";
									}
									
									return group;
								}
							);
						}
					},

					'subdomains': {
						
						templateUrl: 'lists.html',
						controller: function ($scope) {

							$scope.key = "subdomains";
							
							$scope.page = self;
							$scope.data = self.info.subdomains.map(
								subdomain => {
									
									subdomain.visible = false;
									
									subdomain.toggleList = function () {
										subdomain.visible = !subdomain.visible;
									}

									subdomain.listState = function () {
										return subdomain.visible ? "v" : ">";
									}
									
									return subdomain;
								}
							);
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
