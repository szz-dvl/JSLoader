function OP (bg) {

	let self = this;
	
	this.bg = bg;

	this.app = angular.module('optionsPageApp', ['jslPartials', 'ui.router']);
	
	this.app.controller('optionsController', function ($scope, $timeout, $state, $stateParams, $rootScope, $interval) {
		
		$scope.page = self;
		$scope.data_origin = {
			
			reconnecting: false,
			available: self.bg.database_mgr.available,
			connected: self.bg.database_mgr.connected,
			writeable: self.bg.database_mgr.writeable,
			readable: self.bg.database_mgr.readable,
			string: self.bg.option_mgr.data_origin
		}

		if (!$scope.data_origin.available) {
			
			$scope.dbID = $interval(
				() => {
					
					if (self.bg.database_mgr.available) {
						
						$scope.data_origin.available = true;
						$scope.data_origin.connected = self.bg.database_mgr.connected;
						$scope.data_origin.writeable = self.bg.database_mgr.writeable;
						$scope.data_origin.readable  = self.bg.database_mgr.readable;
						
						$interval.cancel($scope.dbID);
					}
					
				}, 5000, 0, false);
			
			$scope.dbID.then(null, () => {
				
				$rootScope.$digest();
				
			});
		}
	});
	
	this.app.config(

		$stateProvider => {
			
			$stateProvider.state('opt-site', {

				resolve: {
					dataDomains: () => { return self.bg.domain_mgr.getSlice(0, 5); },
					dataGroups: () => { return self.bg.group_mgr.getSlice(0, 5); },
					storageContent: () => { return browser.storage.local.get(); },
					dataResources: () => { return self.bg.resource_mgr.getVirtFS("/"); }
				},
				
				views: {
					
					'editor-settings': {
						
						templateUrl: 'editor-settings.html',
						controller: function ($scope, $compile) {
							
							$scope.editor_active = true;

							$scope.onOptChange = (opt) => {
								
								self.bg.option_mgr.persistEditorOpt(opt);
								
								let aux = {};
								
								$scope.opts.forEach(
									opt => {
										
										aux[opt.id] = opt.value;
										
									});
								
								self.bg.option_mgr.events.emit("editor-preview", aux);
								
							};
							
							$scope.opts = [

								{text:'Show gutter line', value: self.bg.option_mgr.editor.showGutter, id: "showGutter", type: "checkbox"},
								{text:'Margin column', value: self.bg.option_mgr.editor.printMarginColumn, id: "printMarginColumn", type: "text"},
								{text:'Font size', value: self.bg.option_mgr.editor.fontSize, id: "fontSize", type: "text"},
								{text:'Editor theme', value: self.bg.option_mgr.editor.theme, id: "theme", type: "select"},
								{text:'Font family', value: self.bg.option_mgr.editor.font, id: "font", type: "select"}
								
							];
						}
					},
					
					'resources': {

						
						templateUrl: 'resources.html',
						controller: function ($scope, $state, $timeout, dataResources) {
		
							$scope.resources_active = true;
							$scope.data_ok = true;
							$scope.list = dataResources;

							$scope.filter = "";
							$scope.name = null;
							$scope.virt_siblings = [];
							$scope.mgr = self.bg.resource_mgr;
							
							self.resourcesFilter = $scope.filterChange = (args) => {

								if (args)
									$scope.filter = args;
								
								if($scope.filterID)
									$timeout.cancel($scope.filterID);

								$scope.filterID = $timeout(
									() => {
										
										$scope.name = null;
										$scope.virt_siblings.length = 0;
										
										self.bg.resource_mgr.getVirtFS($scope.filter)
											.then(new_root => {

												if ($scope.filter.slice(-1) != "/")
													$scope.name = $scope.filter.split("/").slice(0, -1).join("/") + "/";
												
												$scope.list = new_root;
												$scope.data_ok = true;
												
											}, path => {

												if ($scope.filter.slice(-1) != "/") {

													self.bg.resource_mgr.getVirtFS($scope.filter + "/")
														.then(new_root => {
															
															$scope.list = new_root;
															$scope.filter += "/";
															$scope.data_ok = true;
															
														}, path => {
															
															$scope.data_ok = false;
															
														});
													
												} else {
												
													$scope.data_ok = false;

												}

											});
										
									}, 350);

								return $scope.filterID;
							}

							/* User asked to remove the top resource in view, unasisted by views ... (root will never arrive here) */
							$scope.removeChild = (name) => {

								self.bg.resource_mgr.removeResource(name, true)
									.then(() => {
										
										$scope.filter = "";
										$scope.filterChange();
									   
									});

							}

							$scope.__findAppropiateNameFor = (repeated) => {
								
								let cnt = 1;
								let name = repeated;
								let ext = repeated.split(".").pop();
								let orig = repeated;
								
								let found = $scope.virt_siblings.find(
									res => {
										
										return res.name == name;
										
									}
									
								);
								
								while (found) {
									
									name = name.split(".").slice(0, -1).join(".") + cnt.toString() + "." + ext;
									
									found = $scope.virt_siblings.find(
										res => {
											
											return res.name == name;
											
										}
									);
									
									cnt ++;
									
									if (found)
										name = orig;
								}
								
								return name;
							};
							
							$scope._resourceNameValidation = (child) => {

								if ($scope.name) {
									
									/* Must always be true here. */
									
									if ($scope.nameID)
										$timeout.cancel($scope.nameID);

									if (!$scope.virt_siblings.length) {
										
										self.bg.resource_mgr.getVirtFS($scope.name)
											.then(siblings => {

												$scope.virt_siblings = siblings.items;

											});
									}
									
									$scope.nameID = $timeout(
										(child) => {

											/* Names not ending in slash here!! */

											return $scope.__findAppropiateNameFor($scope.name + child).split("/").pop();
											
										}, 2500, true, child
									);
									
									return $scope.nameID;
									
								} else {
									
									return Promise.reject();
									
								}
							}

						   
							self.bg.option_mgr.events.on('new-resource',
								resource => {
									
									$scope.filterChange();
								}
							);
						}
					},
					
					'app-data': {
						
						templateUrl: 'app-data.html',
						controller: function ($scope, $compile, $rootScope, $state, $interval, $timeout, dataGroups, dataDomains) {
							
							$scope.domains = dataDomains;
							$scope.groups = dataGroups;
							$scope.appdata_active = $scope.domains.data.length + $scope.groups.data.length > 0;
							
							$scope.__updateService = () => {

								$scope.dataID = $interval($scope.__updateData, 3500, 0, true, true);
								
							}
							
							self.updateData = $scope.__updateData = (service) => {

								if (!service)
									$interval.cancel($scope.dataID);

								let changes = false;
								
								async.each(['domain', 'group'], (mgr, next) => {

									self.bg[mgr + '_mgr'].getSlice($scope[mgr + 's'].actual, 5)
										.then(
											slice => {

												if (!_.isEqual($scope[mgr + 's'], slice)) {
											
													$scope[mgr + 's'] = slice;
													changes = true;

												}

												next();
											}
										);
									
								}, err => {

									if (!err) {
										
										if (!service) {
											
											if (changes)
												$scope.$digest();											
											
											$scope.__updateService();
										}	
									}
								})
							}

							$scope.newGroups = (slice) => {

								$interval.cancel($scope.dataID);
								$scope.groups = slice;
								$scope.$digest();
								$scope.__updateService();
							};
							
							$scope.newDomains = (slice) => {

								$interval.cancel($scope.dataID);
								$scope.domains = slice;
								$scope.$digest();
								$scope.__updateService();
							};
							
							$scope.goToDomain = (name) => {
								
								self.bg.tabs_mgr.openOrCreateTab('https://' + name);
								
							}
							
							$scope.removeItem = (name, type) => {
								
								self.bg[type + "_mgr"].removeItem(name)
									.then(() => { $scope.__updateData(); });

								self.query_results.length = 0;
							}

							$scope.pushItem = (name, type) => {
								
								if (name) 
									self.bg[type + "_mgr"].pushToDB([name]);
								else {
									
									if (self.bg.group_mgr.groups.length)
										self.bg.group_mgr.pushToDB(self.bg.group_mgr.groups);
									
									if (self.bg.domain_mgr.domains.length)
										self.bg.domain_mgr.pushToDB(self.bg.domain_mgr.domains); /* Only meaningful domains */
								}

								self.query_results.length = 0;
							}
							
							$scope.importData = (file) => {
								
								let reader = new FileReader();
								
								reader.onload = function () {
									
									self.bg.option_mgr.importApp(JSON.parse(reader.result))
										.then($scope.__updateData, console.error);
									
								}
								
								reader.readAsText(file);
							}

							$scope.exportData = () => {
							
								self.bg.option_mgr.exportApp();
							}

							$scope.clearStoredData = () => {
								
								browser.storage.local.clear()
									.then(resp => {

										$scope.__updateData();
										self.bg.resource_mgr.recreateRoot()
											.then(self.resourcesFilter);
										
									});
							}
							
							$scope.editUserDefs = () => {

								self.bg.option_mgr.editUserDefs();

							}

							$timeout($scope.__updateService);
						}
					},
					
					'app-db': {
						
						templateUrl: 'app-db.html',
						controller: function ($scope, $compile, $timeout, $rootScope) {
							
							$scope.appdb_active = false;
							$scope.in_progress = false;
							$scope.db_query = "";
							
							self.query_results = $scope.query_results = [];
							$scope.results_slice = {data: []};
							$scope.filter_events = new EventEmitter();
							
							$scope.getResultsSlice = (actual, len) => {

								return Promise.resolve(
									{
										data: $scope.query_results
											.sort((a,b) => {return a.name > b.name})
											.slice(actual, actual + len),
										
										actual: actual,
										total: $scope.query_results.length 
									}
								)
							};
							
							$scope.newResultsPage = (slice) => {
								
								$scope.results_slice = slice;
								$scope.$digest();

							};

							$scope.dbQuery = () => {
								
								if ($scope.queryID)
									$timeout.cancel($scope.queryID);
									
								$scope.queryID = $timeout(
									str => {
										
										self.bg.database_mgr.queryDB($scope.db_query);
							
									}, 350, false);
								
							}
							
							$scope.updateFromDB = (record) => {

								let data = [];
								
								if (record) {

									record.exists = true;
									
									if (record.type == "Group") 
										$scope.page.bg.database_mgr.getGroups([record.name]);
									else 
										$scope.page.bg.database_mgr.getDomains([record.name]);

								} else { 								
							
									$scope.page.bg.database_mgr.getDomains($scope.query_results.filter(record => { return record.type == "Domain" }).map(domain => { return domain.name }));
									$scope.page.bg.database_mgr.getGroups($scope.query_results.filter(record => { return record.type == "Group" }).map(group => { return group.name }));	
								}
							}

							$scope.validateConnection = (el) => {
								
								/* Won't check options and database properly */
								let str = $scope.data_origin.string;
								let regex = new RegExp(/^mongodb\:\/\/(?:(?:[A-Za-z0-9.]+)\:(?:[A-Za-z0-9\$\_\-\?\/\=]+)\@)?(?:[A-Za-z0-9.]+)(?:((\:)(?:[0-9]+)))?((\/)?(?:(?:[A-Za-z0-9\=\_\-\?]+)?)?)$/)
									.exec(str);
								
								if (regex) {		

									$scope.data_origin.reconnecting = true;
									
									if ($scope.toID)
										$timeout.cancel($scope.toID);
									
									$scope.toID = $timeout(
										str => {

											$scope.in_progress = true;
											
											$scope.page.bg.database_mgr.reconnect(str);
											
										}, 4500, true, str);

								} else if ($scope.toID)
									$timeout.cancel($scope.toID);
								
							}
							
							self.bg.option_mgr.events
								.on('db_change',
									string => {
										
										$scope.data_origin.available = self.bg.database_mgr.available;
										$scope.data_origin.connected = self.bg.database_mgr.connected;
										$scope.data_origin.writeable = self.bg.database_mgr.writeable;
										$scope.data_origin.readable  = self.bg.database_mgr.readable;
										
										if ($scope.data_origin.connected) {
											
											$scope.data_origin.string = string;
											self.bg.option_mgr.persistDBString(string);
											
										}
										
										$scope.data_origin.reconnecting = false;
										$scope.in_progress = false;
										
										$scope.query_results.length = 0;
										$scope.results_slice = {data: []};
										
										$rootScope.$digest();
									}
								)
								.on('db_query',
									results => {
										
										$scope.query_results.length = 0;
										$scope.results_slice = {data: []};
										
										if ($scope.data_origin.connected) {
											
											$scope.query_results.push.apply(
												$scope.query_results, results.map(
													instance => {
													
														return {
														
															name: instance.name,
															type: instance.isGroup() ? "Group" : "Domain",
															scripts: instance.getScriptCount(),
															sites: instance.sites.length,
															exists: self.bg[instance.isGroup() ? "group_mgr" : "domain_mgr"].exists(instance.name)
														};
													}
												)
											);
										}
										
										$scope.filter_events.emit('change');
										$scope.$digest();
									}
								)
								.on('db_newdata',
									() => {
										
										$timeout(self.updateData, 350);
										
									}
								)
								.on('db_error',
									error => {
										
										$scope.data_origin.available = self.bg.database_mgr.available;
										$scope.data_origin.connected = self.bg.database_mgr.connected;
										$scope.data_origin.writeable = self.bg.database_mgr.writeable;
										$scope.data_origin.readable  = self.bg.database_mgr.readable;

										self.bg.notify_mgr.error("DB Error: " + error);
										$rootScope.$digest();
										
									}
								)
						}
					},

					'debug': {
						
						template: '<div ng-repeat="key in keys" style="margin-bottom: 60px; word-wrap:break-word;"><h4> {{ key }} </h4> {{ content[key] }} </div>',
						
						controller: function ($scope, storageContent) {
							
							$scope.content = storageContent;		
							$scope.keys = Object.keys($scope.content);
						}
					}					
				}
			})
		});
	
	this.app.run($state => { $state.go('opt-site') });
	
	/* this.app.factory('dataStorage', function($q) {
	   return $q.resolve(self.bg.option_mgr.getDataInfo());
	   }); */
	
	angular.element(document).ready(
		() => {
			
			angular.bootstrap(document, ['optionsPageApp']);
			
		}
	);
}

browser.runtime.getBackgroundPage()
	.then(
		page => {
			
			page.option_mgr.events = new EventEmitter();
			
			window.onbeforeunload = function () {
				
				page.option_mgr.events = null;
				
			}
			
			new OP(page);				
		}
	);
