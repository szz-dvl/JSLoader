function PA (bg, info) {
	
	var self = this;
	
	this.bg = bg;
	this.info = info;
	this.lists = [];
	
	this.tabId = info.tabId;
	this.url = new URL(this.info.url).name();

	this.app = angular.module('pageActionApp', ['jslPartials', 'ui.router']);
	
	this.app.controller('siteController', function ($scope, $timeout, $state, $stateParams) {
		
		$scope.page = self;
		$scope.page.list_mgr = $scope;
		$scope.info = self.info;
		$scope.hostname = new URL($scope.info.url).hostname;
		
		$scope.user_info = ($scope.info.site.length + $scope.info.subdomains.length + $scope.info.groups.length) != 0; 
		
		$scope.scrips_active = false;
		
		$scope.updateData = function (currentGroup) {

			return new Promise(
				(resolve, reject) => {
					
					$scope.page.bg.getPASite()
						.then(
							info => {
								
								$scope.page.info = $scope.info = info;
								$scope.user_info = (info.site.length + info.subdomains.length + info.groups.length) != 0;
								
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
				
				return item;
			}
		);
	};
	
	this.remove = function (script) {
		
		script.remove().then(self.list_mgr.updateData());
	};
	
	this.reload = function (script, compile, scope) {
		
		self.bg.content_mgr.reloadScriptAt(script, self.tabId)
			.then(results => {
				
				if (!results[0].status) {
					
					let error = results[0].errors[0];
					
					self.bg.notify_mgr.error(error.type + ": " + error.message);
					
				}
				
			}).finally(
				err => {
					
					$("#status-" + script.uuid)
						.replaceWith(compile('<script-status id="status-' + script.uuid + '" status="' + self.bg.content_mgr.getStatus(script.uuid, self.tabId) + '"></script-status>')(scope));
					
				}
			);
	};
	
	this.app.config(
		$stateProvider=> {
			
			$stateProvider.state('pa-site', {

				views: {
					
					'site': {
						
						templateUrl: 'lists.html',
						controller: function ($scope, $compile) {

							$scope.reloadScript = function (scr) {
								self.reload(scr, $compile, $scope);
							}
							
							$scope.key = "resource";
							$scope.data = self.listController("site");
						}
					},
					
					'groups': {
						
						templateUrl: 'lists.html',
						controller: function ($scope, $compile) {

							
							$scope.reloadScript = function (scr) {
								self.reload(scr, $compile, $scope);
							}
							
							$scope.key = "group";
							$scope.data = self.listController('groups');
							
						}
					},

					'subdomains': {
						
						templateUrl: 'lists.html',
						controller: function ($scope, $compile) {

							$scope.reloadScript = function (scr) {
								self.reload(scr, $compile, $scope);
							}
							
							$scope.key = "subdomain";
							$scope.data = self.listController("subdomains");

						}
					},

					'rules': {

						templateUrl: 'rules.html',
						controller: function ($scope) {

							/* Not implemented yet. */
							
							$scope.rules_active = false;
			
						}
					},
					
					'group_mgr': {

						templateUrl: 'groups.html',
						controller: function ($scope, $timeout, $stateParams) {
							
							$scope.groups = $scope.page.bg.group_mgr.groups;
							
							$scope.current = $stateParams["#"] ? $stateParams["#"] : $scope.groups[0];
							
							$scope.url = $scope.page.url;
							
							$scope.events = new EventEmitter();
							$scope.action;
							
							$scope.groups_active = false;
							
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

								/* Not working, to be observed. */
								$scope.current = $("#group_select").val().split(":")[1];
								
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
