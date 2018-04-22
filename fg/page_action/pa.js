function PA (bg, info) {
	
	var self = this;

	this.bg = bg;
	this.info = info;
	this.lists = [];
	
	this.tabId = info.tabId;
	this.url = new URL(this.info.url).name();

	this.app = angular.module('pageActionApp', ['jslPartials', 'ui.router']);
	
	this.app.controller('headController', $scope => {
		
		$scope.page = self;
		
	});
	
	this.app.controller('siteController', function ($scope, $timeout, $state, $stateParams) {
		
		$scope.page = self;
		$scope.page.list_mgr = $scope;
		
		$scope.info = self.info;
		$scope.user_info = ($scope.info.domain.length + $scope.info.site.length + $scope.info.subdomains.length + $scope.info.groups.length) != 0; 
		
		$scope.scripts_btn_text = "Show";
		
		$scope.scrips_active = false;
		
		$scope.toggleScripts = function () {
			
			$scope.scripts_active = !$scope.scripts_active;
			$scope.scripts_btn_text = $scope.scripts_active ? "Hide" : "Show";
			
		}
		
		$scope.updateData = function (currentGroup) {

			return new Promise(
				(resolve, reject) => {
					
					$scope.page.bg.getPASite()
						.then(
							info => {
								
								$scope.page.info = $scope.info = info;
								$scope.user_info = (info.domain.length + info.site.length + info.subdomains.length + info.groups.length) != 0;
								
								$state.transitionTo($state.current, {"#": currentGroup || null}, { 
									
									reload: true, inherit: false, notify: false 
									
								});
								
								browser.pageAction.setIcon(
									{
										path: {
											16: browser.extension.getURL("fg/icons/" + ($scope.user_info ? "red" : "blue") + "-diskette-16.png"),
											32: browser.extension.getURL("fg/icons/" + ($scope.user_info ? "red" : "blue") + "-diskette-32.png")
												
										},

										tabId: $scope.page.tabId
									}
								);
								
								resolve();
							}
						);
				});
		}
	});

	this.listController = function (key) {
		
		return self.info[key].map(
			item => {
				
				item.visible = false;
				item.toggleList = function () {
					item.visible = !item.visible;
				}
				
				item.listState = function () {
					return item.visible ? "v" : ">";
				}
				
				return item;
			}
		);
	};
	
	this.removeAndUpdate = function (script) {
		
		script.remove().then(self.list_mgr.updateData());
	};
	
	this.app.config(
		$stateProvider=> {
			
			$stateProvider.state('pa-site', {

				views: {
					'domain': {
						
						templateUrl: 'lists.html',
						controller: function ($scope) {
							
							$scope.key = "domain";
							$scope.url = self.url;
							$scope.remove = self.removeAndUpdate;
							$scope.data = self.listController($scope.key); 
							
						}
					},
					
					'site': {
						
						templateUrl: 'lists.html',
						controller: function ($scope) {

							$scope.key = "site";
							$scope.url = self.url;
							$scope.remove = self.removeAndUpdate;
							$scope.data = self.listController($scope.key);
							
						}
					},
					
					'groups': {
						
						templateUrl: 'lists.html',
						controller: function ($scope) {
							
							$scope.key = "group";
							$scope.url = self.url;
							$scope.data = self.listController('groups');
							
						}
					},

					'subdomains': {
						
						templateUrl: 'lists.html',
						controller: function ($scope) {
							
							$scope.key = "subdomain";
							$scope.url = self.url;
							$scope.remove = self.removeAndUpdate;
							$scope.data = self.listController("subdomains");
						}
					},
					
					'actions': {

						templateUrl: 'actions.html',
						controller: function ($scope, $timeout, $stateParams) {
							
							$scope.groups = $scope.page.bg.group_mgr.groups;
							
							$scope.current = $stateParams["#"] ? $stateParams["#"] : $scope.groups[0];
							
							$scope.url = $scope.page.url;
							
							$scope.events = new EventEmitter();
							$scope.action;
							
							$scope.setAction = function () {
			
								$scope.page.bg.group_mgr.getOrBringCached($scope.current)
									.then(
										group => {
											
											if (group.isMySite($scope.url))
												$scope.action = "Remove";
											else
												$scope.action = "Add";
											
											$scope.$digest();
										}
									)
							};

							$scope.selectChange = function () {
								
								$scope.setAction();
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
								
								let promise = $scope.action == "Add" ?
															   $scope.page.bg.group_mgr.addSiteTo($scope.current, $scope.url) :
															   $scope.page.bg.group_mgr.removeSiteFrom($scope.current, $scope.url);
								
								promise.then(() => { $scope.page.list_mgr.updateData($scope.current) });			
							};
							
							$scope.addScript = function () {
								
								$scope.page.bg.showEditorForCurrentTab();
							};
							
							$scope.listenTab = function () {
								
								$scope.page.bg.listenRequestsForCurrentTab();
							};
							
							$timeout(
								() => {
									
									$scope.setAction();
									
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

						PA.call(this, page, info);
						
					}
				);						
		}
	);
