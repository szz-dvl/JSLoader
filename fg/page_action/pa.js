function PA (bg, info) {
	
	let self = this;
	
	this.bg = bg;
	this.info = info;
	console.log(info);
	this.lists = [];
	
	this.tabId = info.tabId;
	this.url = new JSLUrl(this.info.url);

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
		$scope.disabled = self.info.disabled;
		$scope.scrips_active = false;
		
		$scope.disableSite = () => {
			
			$scope.disabled = !$scope.disabled;
			self.bg.domain_mgr.toggleDisableFor($scope.hostname);
			
			$scope.onSizeChange();
		}
		
		$scope.removeSite = () => {
			
			self.bg.domain_mgr.removeSite($scope.hostname, self.url.pathname)
				.then($scope.updateData, $scope.updateData);
		}

		$scope.mustShowRemove = () => {

			if ($scope.info.domains.length) {

				let found = false;
				
				for(domain of info.domains) {

					found = domain.list.find(site => site.included);

					if (found)
						break;

				}

				return (found || $scope.info.groups[0].total) && (self.bg.db.available ? self.bg.db.removeable : true);
				
			} else {
				
				return ($scope.info.groups[0].total) && (self.bg.db.available ? self.bg.db.removeable : true);

			}

		}
		
		$scope.switchOrigin = (mgr, elem) => {
			
			let name = mgr == "domain" ? elem.title : elem.name;
			
			if (elem.in_storage) {

				if (self.bg.db.writeable) {
					
					self.bg[mgr + '_mgr'].move2DB(name)
						.then(() => {
						
							elem.in_storage = false;
							$scope.$digest();

						})
				}

			} else {

				/* If the domain is listed here DB is readable.*/
				
				self.bg[mgr + '_mgr'].import2ST(name)
					.then(() => {
						
						elem.in_storage = true;
						$scope.$digest();
						
					})
			}
		};

		$scope.canDisable = (list, item) => {

			if (list.title == self.bg.texts.findText('groups'))
				return item.in_storage || self.bg.db.writeable;
			else
				return list.in_storage || self.bg.db.writeable
		};

		$scope.canRemove = (list, item) => {

			if (list.title == self.bg.texts.findText('groups'))
				return item.in_storage || (self.bg.db.writeable && self.bg.db.removeable);
			else
				return list.in_storage || (self.bg.db.writeable && self.bg.db.removeable);
		};
		
		$scope.updateData = (err) => {

			/* TO-DO: Notify on error */
			
			return new Promise(
				(resolve, reject) => {

					$scope.page.bg.getPASite()
						.then(
							info => {
								
								$scope.info = self.info = info;
								
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

					if (nval) {
						self.addOpenedSection(item.section + item.name);
					} else {
						self.removeOpenedSection(item.section + item.name);
					}
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
				
				scope.scheduleUpdateAt(350, script.getParentName());

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
							
							$scope.data = self.info.domains;

							$scope.reloadScript = (scr) => {
								self.reload(scr, $compile, $scope);								
							}
							
							$scope.scheduleUpdateAt = (to, url) => {
								
								if ($scope[name + "Id"])
									$timeout.cancel($scope[name + "Id"]);
								
								$scope[name + "Id"] = $timeout((url) => {

									let site = '/' + url.split("/").slice(1).join("/");
									let name = url.split("/")[0];
									
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
											}
											
											$rootScope.$digest();
										});
									
								}, to, false, url);

								return $scope[name + "Id"];
							}
							
							$scope.removeScript = (script) => {
								
								self.remove(script, $scope);
								
							};

							for (let list of $scope.data) {
								
								list.list = list.list.map(site => { return self.itemExtend(site, $scope, list.title) } );
								list.visible = self.mustOpen(list.name);	

								list.mustPag = () => {
									return !list.list.find(item => { return item.visible }) && list.total > 5;
								};
								
								$scope.$watch(() => { return list.visible },
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

								/* Will it ever happens? => tbt */
								
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

							$scope.data = self.info.groups;

							$scope.reloadScript = (scr) => {
								self.reload(scr, $compile, $scope);
							}
							
							$scope.data[0].list = self.info.groups[0].list.map(scripts => { return self.itemExtend(scripts, $scope, self.bg.texts.findText('groups')) } );
							$scope.data[0].visible = self.mustOpen(self.bg.texts.findText('groups'));

							$scope.data[0].mustPag = () => {
								
								return !$scope.data[0].list.find(item => { return item.visible }) && $scope.data[0].total > 5;
							};
							
							$scope.$watch(() => { return $scope.data[0].visible },
								(nval, oval) => {
									
									if (nval != oval) {										
										
										$scope.onSizeChange();

										if (nval)
											self.addOpenedSection(self.bg.texts.findText('groups'));
										else
											self.removeOpenedSection(self.bg.texts.findText('groups'));
										
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
											self.decreasePageIdx(self.bg.texts.findText('groups'), name);
										
										self.bg.group_mgr.getPASliceFor(
											$scope.data[0].list.length == 1 && mgr ? ($scope.data[0].actual - 5 < 0 ? 0 : $scope.data[0].actual - 5) : $scope.data[0].actual, 5,
											self.bg.texts.findText('groups'), self.url, self.pa_state.page_idx)
											.then(slice => {
												
												$scope.data[0].actual = slice.actual;
												$scope.data[0].total = slice.total;
												
												if (slice.total) {
													
													$scope.data[0].list = slice.members.map(
														scripts => {
															return self.itemExtend(scripts, $scope, self.bg.texts.findText('groups'))
														}
													);
												
												} 
											
												$rootScope.$digest();
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
								
								self.addPageIdx(self.bg.texts.findText('groups'), group_name, slice.actual);
								
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
										return self.itemExtend(scripts, $scope, self.bg.texts.findText('groups'))
									}
								);
								
								$scope.$digest();
							}

							$timeout(() => {
								
								if (self.pa_state.outdated) {

									$scope.scheduleUpdateAt(50, self.pa_state.outdated, true)
										.then(() => { self.pa_state.outdated = null; });
									
								}

							})
						}
					},
					
					'group_mgr': {

						templateUrl: 'groups.html',
						controller: function ($scope, $timeout, $stateParams, $location, $anchorScroll, $compile) {

							$scope.current = self.bg.group_mgr.groups[0];
							$scope.groups_active = false;
							
							$scope.url = self.url;
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
							
							$scope.setAction = () => {

								if ($scope.current) {
									
									$scope.page.bg.group_mgr.getItem($scope.current)
										.then(
											group => {
												
												if (group.includes($scope.url)) { 

													$scope.action = self.bg.texts.findText('remove');
													$scope.enabled = group.isMySite($scope.url);
													
												} else {
													
													$scope.action = self.bg.texts.findText('add');
													$scope.enabled = true;
												}
												
												$scope.$digest();
											}
										)
								} 
							};
							
							$scope.selectChange = (nval) => {
								
								if (nval) {
										
									$scope.current = nval;
									$scope.setAction();
								}
							};
							
							$scope.events
								.on('validation_start',
									pending => {
										
										$scope.validation_in_progress = true;
										
									})
								
								.on('validation_ready',
									validated => {
										
										$scope.url = new JSLUrl(validated);
										$scope.validation_in_progress = false;
										$scope.setAction();
										
									});
							
							$scope.addSite = () => {
								
								let promise = $scope.action == self.bg.texts.findText('add') ?
											  $scope.page.bg.group_mgr.addSiteTo($scope.current, $scope.url.name) :
											  $scope.page.bg.group_mgr.removeSiteFrom($scope.current, $scope.url.name);
								
								promise.then(
									() => {
										
										if (self.updateGroups) {
											
											self.updateGroups(350, $scope.current, true)
												.then(() => {

													$scope.onSizeChange()
														.then($scope.setAction);
													
												});
											
										} else {

											$scope.setAction();
											self.pa_state.outdated = $scope.current;
											
										}
									});			
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

			$(window).on('unload',
				() => {
				
					page.pa_events = null;
				
				}
			);

			page.getPASite()
				.then(
					info => {
						
						new PA(page, info);
						
					}
				);
			
		}
	);
