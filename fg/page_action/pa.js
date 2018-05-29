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
		sections: ""
		
	};
	
	this.app = angular.module('pageActionApp', ['jslPartials', 'ui.router']);
	
	this.app.controller('siteController', function ($scope, $timeout, $state, $compile, $stateParams) {
		
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
			
			self.bg.domain_mgr.removeItem($scope.hostname)
				.then(() => { self.scheduleUpdateAt(350); }, console.error);
		}
		
		$scope.updateData = () => {

			return new Promise(
				(resolve, reject) => {
					
					$scope.page.bg.getPASite()
						.then(
							info => {
								
								$scope.info = self.info = info;
								$scope.user_info = (info.site.length + info.subdomains.length + info.groups.length) != 0;
								
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

		self.bg.pa_events.on('new-status', (error, notify) => {

			let uuid = error.id;
			let elem = $("#status-" + uuid);

			if (elem.length) {
				
				elem.replaceWith($compile('<script-status id="status-' 
					+ uuid 
					+ '" status="' 
					+ self.bg.content_mgr.getStatus(uuid, self.tabId) 
						+ '"></script-status>')($scope));

				if (notify)
					self.bg.notify_mgr.error(error.at + '\n' + error.type + ": " + error.message + '[' + error.line + ',' + error.col + ']');
				
			}
		});
		
	});

	this.itemExtend = (item, scope, section) => {

		item.section = section
		item.visible = self.mustOpen(item.section + item.name);
		
		scope.$watch(() => { return item.visible },
			(nval, oval) => {
				
				if (nval != oval) {
					
					scope.onSizeChange();

					if (nval)
						self.addOpenedSection(item.section + item.name);
					else
						self.removeOpenedSection(item.section + item.name);
				}
			}
		);
		
		return item;
	};

	this.scheduleUpdateAt = (to) => {
		
		if (self.updtId)
			clearTimeout(self.updtId);
		
		self.updtId = setTimeout(() => {
			
			this.list_mgr.updateData();
			
		}, to)
	}
	
	this.remove = (script) => {
		
		script.remove().then(() => { this.scheduleUpdateAt(350); });
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
						.replaceWith(compile('<script-status id="status-' 
							+ script.uuid 
							+ '" status="' 
							+ this.bg.content_mgr.getStatus(script.uuid, this.tabId) 
								+ '"></script-status>')(scope));		
				}
			);
	};

	this.addOpenedSection = (name) => {

		self.pa_state.sections += (";" + name); 
		
	};
	
	this.removeOpenedSection = (name) => {
		
		let split = self.pa_state.sections.split(";");
		split.remove(split.indexOf(name));
		
		self.pa_state.sections = split.join(";");
	};
	
	this.mustOpen = (name) => {
		
		return self.pa_state.sections.split(";")
			.find(sec => { return sec == name; }) ? true : false;	
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
							
							$scope.data = [{
								
								title: $scope.hostname,
								list: self.info["site"].map(site => { return self.itemExtend(site, $scope, $scope.hostname) } ),
								visible: self.mustOpen($scope.hostname)
									
							}];

							$scope.$watch(() => { return $scope.data[0].visible },
								(nval, oval) => {
				
									if (nval != oval) {
										
										$scope.onSizeChange();
										
										if (nval)
											self.addOpenedSection($scope.hostname);
										else
											self.removeOpenedSection($scope.hostname);
										
									}
								}
							);
							
						}
					},
					
					'groups': {
						
						templateUrl: 'lists.html',
						controller: function ($scope, $compile, $stateParams) {
							
							$scope.reloadScript = (scr) => {
								self.reload(scr, $compile, $scope);
							}
							
							$scope.data = [{title: 'Groups', list: self.info["groups"].map(scripts => { return self.itemExtend(scripts, $scope, 'Groups') } ), visible: self.mustOpen('Groups') } ];

							$scope.$watch(() => { return $scope.data[0].visible },
								(nval, oval) => {
									
									if (nval != oval) {
										
										$scope.onSizeChange();

										if (nval)
											self.addOpenedSection('Groups');
										else
											self.removeOpenedSection('Groups');
										
									}
								}
							);
						}
					},

					'subdomains': {
						
						templateUrl: 'lists.html',
						controller: function ($scope, $compile, $stateParams) {
							
							$scope.reloadScript = (scr) => {
								self.reload(scr, $compile, $scope);
							}
							
							$scope.data = [];

							for (let list of self.info["subdomains"]) {

								let elem = { title: list.name, list: list.sites.map(site => { return self.itemExtend(site, $scope, list.name) } ), visible: self.mustOpen(list.name) };

								$scope.data.push(elem);

								$scope.$watch(() => { return elem.visible },
									(nval, oval) => {
										
										if (nval != oval) {
											
											$scope.onSizeChange();

											if (nval)
												self.addOpenedSection(elem.title);
											else
												self.removeOpenedSection(elem.title);
											
										}
									}
								);
							}
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
											
											/* ¿¿ isMySite vs includes ??*/
											if (group.isMySite($scope.url))
												$scope.action = "Remove";
											else
												$scope.action = "Add";

											$scope.$digest();
										}
									)
							};
							
							$scope.selectChange = (nval) => {
								
								self.pa_state.current_group = $scope.current = nval; //still not working.
								$scope.setAction();
							};
							
							$scope.events
								.on('validation_start',
									pending => {
										
										$scope.validation_in_progress = true;
										
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
								
								promise.then(() => { self.scheduleUpdateAt(350); });			
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

/* !! catch error !! */
browser.runtime.getBackgroundPage()
	.then(
		page => {

			page.pa_events = new EventEmitter();

			$(window).unload(() => {
				
				page.pa_events = null;
				
			});
			
			page.getPASite()
				.then(
					info => {
						
						new PA(page, info);
						
					}
				);
			
		}
	);
