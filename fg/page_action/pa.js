function PA (bg, info) {
	
	var self = this;
	
	this.bg = bg;
	this.info = info;
	this.lists = [];
	
	this.tabId = info.tabId;
	this.url = new URL(this.info.url).name();

	this.pa_state = {

		script_list: false,
		group_mgr: false,
		current_group: self.bg.group_mgr.groups[0],
		lists: {
			
			groups: info.groups.map(group => { return { name: group.name, state: false }; }),
			site: info.site.map(resource => { return { name: resource.name, state: false }; }),
			subdomains: info.subdomains.map(subdomain => { return { name: subdomain.name, state: false }; })
		}
	};

	this.removeObsolete = function (info) {
		
		for (let key of Object.keys(self.pa_state.lists)) {
			
			for (let state of self.pa_state.lists[key]) {
			
				let found_item = info[key]
					.find(
						item => {
							
							return item.name == state.name;
							
						}
					);

				if (!found_item) {

					self.pa_state.lists[key].remove(
						self.pa_state.lists[key].findIndex(
							old_state => {
								return old_state.name == state.name;
							}
						)
					);
				}
			}
		}
	};
	
	this.app = angular.module('pageActionApp', ['jslPartials', 'ui.router']);
	
	this.app.controller('siteController', function ($scope, $timeout, $state, $stateParams) {
		
		$scope.page = self;
		$scope.page.list_mgr = $scope;
		$scope.info = self.info;
		$scope.hostname = new URL($scope.info.url).hostname;
		$scope.groups = $scope.page.bg.group_mgr.groups;
		
		$scope.user_info = ($scope.info.site.length + $scope.info.subdomains.length + $scope.info.groups.length) != 0; 
		
		$scope.scrips_active = self.pa_state.script_list;
		
		$scope.updateData = function () {

			return new Promise(
				(resolve, reject) => {
					
					$scope.page.bg.getPASite()
						.then(
							info => {
								
								$scope.page.info = $scope.info = info;
								$scope.user_info = (info.site.length + info.subdomains.length + info.groups.length) != 0;

								self.removeObsolete(info);

								browser.pageAction.setIcon(
									{
										path: {
											16: browser.extension.getURL("fg/icons/" + ($scope.user_info ? "red" : "blue") + "-diskette-16.png"),
											32: browser.extension.getURL("fg/icons/" + ($scope.user_info ? "red" : "blue") + "-diskette-32.png")
												
										},

										tabId: $scope.page.tabId
									}
								);
								
								$state.transitionTo($state.current, { "state": self.pa_state }, { 
									
									reload: true, inherit: false, notify: false 
									
								}).then(resolve, reject);
							});
				});
		}
		
		$scope.onSizeChange = function () {

			if ($scope.sizeID)
				$timeout.cancel($scope.sizeID);

			$scope.sizeID = $timeout(
				() => {

					let height = Math.min(
						
						($("#scripts-content").outerHeight() + $("#groups-content").outerHeight() + $("#pa-header").outerHeight()),
						450
						
					);

					if (height == 450)
						$("#pa-content").css("overflow-y", "scroll");
					else
						$("#pa-content").css("overflow-y", "hidden");
					
					$("body").css("height", height + "px");
					
				}, 20);

			return $scope.sizeID;
		}

		$scope.$watch(() => { return $scope.scripts_active },
			nval => {

				$scope.onSizeChange();
				self.pa_state.script_list = nval;
				
			}
		);
		
	});

	this.listController = function (key, scope, state) {
		
		return self.info[key].map(
			item => {
				
				let gotState = state.lists[key].find(
					item_state => {
						
						return item_state.name == item.name; 
					}
				 );
				
				item.visible = gotState ? gotState.state : false;

				if (!gotState)
					self.pa_state.lists[key].push({ name: item.name, state: false });
				
				scope.$watch(() => { return item.visible },
					nval => {

						scope.onSizeChange();
						
						let idx = self.pa_state.lists[key].findIndex(
							item_state => {
								
								return item_state.name == item.name;
								
							}
						);
						
						self.pa_state.lists[key][idx].state = nval;
					}
				);
				
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
		$stateProvider => {
			
			$stateProvider.state('pa-site', {
				params: {
					state: null
				},
				views: {
					
					'site': {
						
						templateUrl: 'lists.html',
						controller: function ($scope, $compile, $stateParams) {

							$scope.reloadScript = function (scr) {
								self.reload(scr, $compile, $scope);
							}
							
							$scope.key = "resource";
							$scope.data = self.listController("site", $scope, $stateParams.state);
							
						}
					},
					
					'groups': {
						
						templateUrl: 'lists.html',
						controller: function ($scope, $compile, $stateParams) {

							
							$scope.reloadScript = function (scr) {
								self.reload(scr, $compile, $scope);
							}
							
							$scope.key = "group";
							$scope.data = self.listController('groups', $scope, $stateParams.state);
							
						}
					},

					'subdomains': {
						
						templateUrl: 'lists.html',
						controller: function ($scope, $compile, $stateParams) {

							$scope.reloadScript = function (scr) {
								self.reload(scr, $compile, $scope);
							}
							
							$scope.key = "subdomain";
							$scope.data = self.listController("subdomains", $scope, $stateParams.state);

						}
					},
					
					'group_mgr': {

						templateUrl: 'groups.html',
						controller: function ($scope, $timeout, $stateParams, $location, $anchorScroll) {
							
							$scope.current = $stateParams.state.current_group;
							$scope.groups_active = $stateParams.state.group_mgr;
							
							$scope.url = $scope.page.url;
							$scope.events = new EventEmitter();
							
							$scope.action;
							
							$scope.$watch(() => { return $scope.groups_active },
								nval => {

									$scope.onSizeChange()
										.then(
											() => {

												if (nval) {

													$location.hash('button-bottom');
													$anchorScroll();
													
												}
											}
										);
									
									self.pa_state.group_mgr = nval;
									
								}
							);
							
							$scope.setAction = function () {
								
								$scope.page.bg.group_mgr.getItem($scope.current)
									.then(
										group => {

											/* ¿¿ isMySite vs ownerOf ??*/
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
								self.pa_state.current_group = $scope.current = $("#group_select").val().split(":")[1];
								
								$scope.setAction();
							};
							
							$scope.events
								.on('validation_start',
									pending => {

										$scope.validation_in_progress = true;
										$scope.$digest();
										
									})
								
								.on('validation_ready',
									validated => {
										
										$scope.url = validated;
										$scope.validation_in_progress = false;
										$scope.setAction();
										
									});
							
							$scope.addSite = function () {
								
								let promise = $scope.action == "Add" ?
															   $scope.page.bg.group_mgr.addSiteTo($scope.current, $scope.url) :
															   $scope.page.bg.group_mgr.removeSiteFrom($scope.current, $scope.url);
								
								promise.then($scope.page.list_mgr.updateData);			
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
	
	this.app.run($state => { $state.go('pa-site', { state: self.pa_state }) });
	
	angular.element(document).ready(
		() => {
			
			angular.bootstrap(document, ['pageActionApp']);
		}
	);
}

browser.runtime.getBackgroundPage()
	.then(
		page => {
			page.getPASite() /* To provider! */
				.then(
					info => {
						
						PA.call(this, page, info);
						
					}
				);						
		}
	);
