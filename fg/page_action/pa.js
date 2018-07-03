function PA (bg, info) {
	
	let self = this;
	
	this.bg = bg;
	this.info = info;
	this.lists = [];
	
	this.tabId = info.tabId;
	this.url = new URL(this.info.url);

	this.pa_state = {
		
		sections: "",
		page_idx: []
		
	};
	
	this.app = angular.module('pageActionApp', ['jslPartials', 'ui.router']);
	
	this.app.controller('siteController', function ($scope, $timeout, $state, $compile, $stateParams) {
		
		$scope.page = self;
		$scope.info = self.info;
		
		$scope.page.list_mgr = $scope;
		$scope.hostname = self.url.hostname;
		$scope.groups = self.bg.group_mgr.groups;
		$scope.disabled = self.info.disabled;
		$scope.scrips_active = false;
		
		$scope.disableSite = () => {
			
			$scope.disabled = !$scope.disabled;
			self.bg.domain_mgr.toggleDisableFor($scope.hostname);
			
			$scope.onSizeChange();
		}

		$scope.removeSite = () => {
			
			self.bg.domain_mgr.removeSite($scope.hostname)
				.then($scope.updateData, console.error);
		}
		
		$scope.updateData = () => {

			return new Promise(
				(resolve, reject) => {
					
					$scope.page.bg.getPASite()
						.then(
							info => {
								
								$scope.info = self.info = info;
								$scope.groups = self.bg.group_mgr.groups;
								
								browser.pageAction.setIcon(
									{
										path: {

											16: browser.extension.getURL("fg/icons/blue-diskette-16.png"),
											32: browser.extension.getURL("fg/icons/blue-diskette-32.png")
												
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
			(nval, oval) => {

				if (nval != oval)
					$scope.onSizeChange();
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

	this.remove = (script, scope) => {
		
		script.remove().then(
			parent => {
				
				scope.scheduleUpdateAt(350, script.getParentName(), script.parent.url || null);

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

	this.addPageIdx = (section, list, first) => {

		let idx = self.pa_state.page_idx.findIndex(
			record => {
				
				return record.section == section && record.list == list;			
				
			}
		);

		if (idx >= 0) {

			if (first)
				self.pa_state.page_idx[idx].first = first;
			else
				self.pa_state.page_idx.remove(idx);
			
		} else if (first)
			self.pa_state.page_idx.push({ section: section, list: list, first: first });
				
	}

	this.decreasePageIdx = (section, list) => {

		let idx_elem = self.pa_state.page_idx.find(
			record => {
				
				return record.section == section && record.list == list;			
				
			}
		);

		if (idx_elem) {
			
			if (idx_elem.first - 5 <= 0)
				idx_elem.first = 0
			else
				idx_elem.first -= 5;
		}
	}
	
	this.app.config(
		$stateProvider => {
			
			$stateProvider.state('pa-site', {
				params: {
					state: null
				},
				views: {
					
					'domains': {
						
						templateUrl: 'lists.html',
						controller: function ($scope, $compile, $stateParams, $timeout, $rootScope) {
							
							$scope.data = [];
							
							$scope.reloadScript = (scr) => {
								self.reload(scr, $compile, $scope);								
							}
							
							$scope.scheduleUpdateAt = (to, name, site) => {
								
								if ($scope[name + "Id"])
									$timeout.cancel($scope[name + "Id"]);
								
								$scope[name + "Id"] = $timeout((name, site) => {

									let idx = $scope.data.findIndex(
										list => {
											
											return list.title == name;
											
										}
									);

									let slist = $scope.data[idx].list.find(
										inner => {
											
											return inner.name == site;
											
										}
									);
									
									if (slist.scripts.length == 1)
										self.decreasePageIdx(name, site);
									
									self.bg.domain_mgr.getPASliceFor(
										$scope.data[idx].list.length == 1 ? ($scope.data[idx].actual - 5 < 0 ? 0 : $scope.data[idx].actual - 5) : $scope.data[idx].actual,
										5, name, self.url, self.pa_state.page_idx)
										.then(slice => {

											$scope.data[idx].actual = slice.actual;
											$scope.data[idx].total = slice.total;
											
											if (slice.total) {

												$scope.data[idx].list = slice.sites.map(
													site => {
														return self.itemExtend(site, $scope, name)
													}
												);
												
											} else {
												
												$scope.data.remove(idx);

												self.info.domains.remove(
													self.info.domains.findIndex(
														domain => {
															return domain.name == name
														}
													)
												);
											}
											
											$rootScope.$digest();
										});
									
								}, to, false, name, site);

								return $scope[name + "Id"];
							}
							
							$scope.removeScript = (script) => {
								
								self.remove(script, $scope);
								
							};

							for (let list of self.info.domains) {

								let elem = {

									title: list.name,
									list: list.sites.map(site => { return self.itemExtend(site, $scope, list.name) } ),
									visible: self.mustOpen(list.name),
									actual: list.actual,
									total: list.total
									
								};
								
								$scope.data.push(elem);
							
								$scope.$watch(() => { return elem.visible },
									(nval, oval) => {
										
										if (nval != oval) { 	
											
											$scope.onSizeChange();

											if (nval)
												self.addOpenedSection(list.name);
											else
												self.removeOpenedSection(list.name);
										}
									}
								);
							}
							
							$scope.newScriptsFor = (slice, target, site) => {
								
								let elem = $scope.data.find(
									list => {

										return list.title == target;
										
									}).list.find(
										item => {
										
											return item.name == site;
										
										}
									);
								
								self.addPageIdx(target, site, slice.actual);
								
								elem.scripts = slice.data;
								elem.actual = slice.actual;
								elem.total = slice.total;
								
								$scope.$digest();
							}

							$scope.newSliceFor = (slice, target) => {

								/* Will it ever happens? */
								
								let idx = $scope.data.findIndex(
									list => {
											
										return list.title == target;
											
									}
								);
								
								$scope.data[idx].actual = slice.actual;
								$scope.data[idx].total = slice.total;
											
								$scope.data[idx].list = slice.sites.map(
									site => {
										return self.itemExtend(site, $scope, name)
									}
								);
								
								$scope.$digest();
							}
						}
					},
					
					'groups': {
						
						templateUrl: 'lists.html',
						controller: function ($scope, $compile, $stateParams, $timeout, $rootScope) {
							
							$scope.reloadScript = (scr) => {
								self.reload(scr, $compile, $scope);
							}
							
							$scope.data = [
								{
									title: 'Groups',
									list: self.info.groups.members.map(scripts => { return self.itemExtend(scripts, $scope, 'Groups') } ),
									visible: self.mustOpen('Groups'),
									actual: self.info.groups.actual,
									total: self.info.groups.total
								}
							];

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

							self.updateGroups = $scope.scheduleUpdateAt = (to, name, mgr) => {
								
								if ($scope.updtId)
									$timeout.cancel($scope.updtId);
								
								$scope.updtId = $timeout(
									name => {

										let glist = $scope.data[0].list
											.find(
												inner => {

													return inner.name == name;
																										
												}
											);
										
										if (glist && glist.scripts.length == 1)
											self.decreasePageIdx('Groups', name);
										
										self.bg.group_mgr.getPASliceFor(
											$scope.data[0].list.length == 1 && mgr ? ($scope.data[0].actual - 5 < 0 ? 0 : $scope.data[0].actual - 5) : $scope.data[0].actual, 5,
											'Groups', self.url, self.pa_state.page_idx)
											.then(slice => {
												
												$scope.data[0].actual = slice.actual;
												$scope.data[0].total = slice.total;
												
												if (slice.total) {
													
													$scope.data[0].list = slice.members.map(
														scripts => {
															return self.itemExtend(scripts, $scope, 'Groups')
														}
													);
												
												} 
											
												$scope.$digest();
											});
										
									}, to, false, name);

								return $scope.updtId;
							}
							
							$scope.removeScript = (script) => {
								
								self.remove(script, $scope);
								
							};

							$scope.newScriptsFor = (slice, target, group_name) => {
								
								let elem = $scope.data[0].list.find(
									item => {
										
										return item.name == group_name;
										
									}
								);
								
								self.addPageIdx('Groups', group_name, slice.actual);
								
								elem.scripts = slice.data;
								elem.actual = slice.actual;
								elem.total = slice.total;
								
								$scope.$digest();
							}

							$scope.newSliceFor = (slice, target) => {

								$scope.data[0].actual = slice.actual;
								$scope.data[0].total = slice.total;
								
								$scope.data[0].list = slice.members.map(
									scripts => {
										return self.itemExtend(scripts, $scope, 'Groups')
									}
								);
								
								$scope.$digest();
							}
						}
					},
					
					'group_mgr': {

						templateUrl: 'groups.html',
						controller: function ($scope, $timeout, $stateParams, $location, $anchorScroll) {

							$scope.current = $scope.groups[0];
							$scope.groups_active = false;
							
							$scope.url = self.url.name();
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
								}
							);
							
							$scope.setAction = (update) => {

								if (update)
									$scope.current = update;
								
								$scope.page.bg.group_mgr.getItem($scope.current)
									.then(
										group => {
											
											if (group.includes(self.url))
												$scope.action = "Remove";
											else
												$scope.action = "Add";

											$scope.$digest();
										}
									)
							};
							
							$scope.selectChange = (nval) => {
								
								$scope.current = nval;
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
								
								promise.then(() => { self.updateGroups(350, $scope.current, true).then(() => {

									let update = null;
									if ($scope.groups.length != self.bg.group_mgr.groups.length) { 

										$scope.groups = self.bg.group_mgr.groups;
										update = $scope.groups[0]; 
									}
								
									$scope.onSizeChange().then(() => { $scope.setAction(update) });

								}); });			
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
