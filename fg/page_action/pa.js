function PA (bg, info) {
	
	let self = this;
	
	this.bg = bg;
	this.info = info;
	this.lists = [];
	
	this.tabId = info.tabId;
	this.url = new URL(this.info.url).name();

	this.pa_state = {

		script_list: false,
		group_mgr: false,
		current_group: bg.group_mgr.groups[0],
		lists: {
			
			groups: info.groups.map(group => { return { name: group.name, state: false }; }),
			site: info.site.map(resource => { return { name: resource.name, state: false }; }),
			subdomains: info.subdomains.map(subdomain => { return { name: subdomain.name, state: false }; })
		}
	};

	this.removeObsolete = (info) => {
		
		for (let key of Object.keys(this.pa_state.lists)) {
			
			for (let state of this.pa_state.lists[key]) {
			
				let found_item = info[key]
					.find(
						item => {
							
							return item.name == state.name;
							
						}
					);

				if (!found_item) {

					this.pa_state.lists[key].remove(
						this.pa_state.lists[key].findIndex(
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
		$scope.info = self.info;
		
		$scope.page.list_mgr = $scope;
		$scope.hostname = new URL(self.info.url).hostname;
		$scope.groups = self.bg.group_mgr.groups;
		$scope.disabled = self.info.disabled;
		$scope.user_info = ($scope.info.site.length + $scope.info.subdomains.length + $scope.info.groups.length) != 0; 
		$scope.scrips_active = self.pa_state.script_list;

		$scope.disableSite = () => {

			$scope.disabled = !$scope.disabled;
			self.bg.domain_mgr.toggleDisableFor($scope.hostname);
			
			$scope.onSizeChange();
		}

		$scope.removeSite = () => {

			/* Are U sure? */
			self.bg.domain_mgr.removeItem($scope.hostname)
				.then($scope.updateData, console.error);
		}
		
		$scope.updateData = () => {

			return new Promise(
				(resolve, reject) => {
					
					$scope.page.bg.getPASite()
						.then(
							info => {
								
								$scope.info = self.info = info;
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
		
		$scope.onSizeChange = () => {

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

	this.listController = (key, scope, state) => {

		
		/* To be observed
		   console.log("listController for " + key);
		   console.log(this.info[key]); */
		
		return this.info[key].map(
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
					(nval, oval) => {

						if (nval != oval) {
							
							scope.onSizeChange();
						
							let idx = self.pa_state.lists[key].findIndex(
								item_state => {
									
									return item_state.name == item.name;
								
								}
							);
						
							self.pa_state.lists[key][idx].state = nval;
						}
					}
				);
				
				return item;
			}
		);
	};
	
	this.remove = (script) => {
		
		script.remove().then(this.list_mgr.updateData());
	};
	
	this.reload = (script, compile, scope) => {
		
		this.bg.content_mgr.reloadScriptAt(script, this.tabId)
			.then(results => {
				
				if (!results[0].status) {
					
					let error = results[0].errors[0];
					
					this.bg.notify_mgr.error(error.type + ": " + error.message);
					
				}
				
			}).finally(
				err => {
					
					$("#status-" + script.uuid)
						.replaceWith(compile('<script-status id="status-' + script.uuid + '" status="' + this.bg.content_mgr.getStatus(script.uuid, this.tabId) + '"></script-status>')(scope));
					
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

							$scope.reloadScript = (scr) => {
								self.reload(scr, $compile, $scope);
							}
							
							$scope.key = "resource";
							$scope.data = self.listController("site", $scope, $stateParams.state);
							
						}
					},
					
					'groups': {
						
						templateUrl: 'lists.html',
						controller: function ($scope, $compile, $stateParams) {

							
							$scope.reloadScript = (scr) => {
								self.reload(scr, $compile, $scope);
							}
							
							$scope.key = "group";
							$scope.data = self.listController('groups', $scope, $stateParams.state);
							
						}
					},

					'subdomains': {
						
						templateUrl: 'lists.html',
						controller: function ($scope, $compile, $stateParams) {

							$scope.reloadScript = (scr) => {
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
							
							$scope.setAction = () => {
								
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
							
							$scope.selectChange = () => {

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
							
							$scope.addSite = () => {
								
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
			page.getPASite()
				.then(
					info => {

						new PA(page, info);
						
					}
				);						
		}
	);
