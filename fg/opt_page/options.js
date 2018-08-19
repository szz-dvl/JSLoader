function OP (bg) {

	let self = this;
	
	this.bg = bg;

	this.app = angular.module('optionsPageApp', ['jslPartials', 'ui.router']);
	
	this.app.controller('optionsController', function ($scope, $timeout, $state, $stateParams, $rootScope, $interval) {
		
		$scope.page = self;
	
	});
	
	this.app.config(

		$stateProvider => {
			
			$stateProvider.state('opt-site', {

				resolve: {
					dataDomains: () => { return self.bg.domain_mgr.getSlice(0, 5); },
					dataGroups: () => { return self.bg.group_mgr.getSlice(0, 5); },
					storageContent: () => { return new Promise (resolve =>  { chrome.storage.local.get(null, resolve)}); },
					dataResources: () => { return self.bg.resource_mgr.getVirtFS("/"); }  //return Promise.resolve({name: "/", items: []}) , return self.bg.resource_mgr.getVirtFS("/");
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

								{text:self.bg.texts.findText('show_gutter'), value: self.bg.option_mgr.editor.showGutter, id: "showGutter", type: "checkbox"},
								{text:self.bg.texts.findText('margin_col'), value: self.bg.option_mgr.editor.printMarginColumn, id: "printMarginColumn", type: "text"},
								{text:self.bg.texts.findText('font_size'), value: self.bg.option_mgr.editor.fontSize, id: "fontSize", type: "text"},
								{text:self.bg.texts.findText('edit_theme'), value: self.bg.option_mgr.editor.theme, id: "theme", type: "select"},
								{text:self.bg.texts.findText('font_fam'), value: self.bg.option_mgr.editor.font, id: "font", type: "select"}
							];
						}
					},
					
					'resources': {

						
						templateUrl: 'resources.html',
						controller: function ($scope, $state, $timeout, dataResources) {

							$scope.resources_active = true;
							$scope.data_ok = true;
							$scope.list = dataResources;
							$scope.events = new EventEmitter();
							
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
										
									}, 650);

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

											let aux = child.split(".").slice(0, -1).join(".");
											let ext = child.split(".").pop();
									   
											while (aux.endsWith("/"))
												aux = aux.slice(0, -1);
						
											return $scope.__findAppropiateNameFor($scope.name + aux + "." + ext).split("/").pop();
											
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
							$scope.in_progress = false;
							$scope.string = self.bg.db.data_origin;
							
							$scope.__updateService = () => {

								$scope.dataID = $interval($scope.__updateData, 3500, 0, true, true);
								
							}

							$scope.__stopService = () => {

								if ($scope.dataID)
									$interval.cancel($scope.dataID);
								
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

							$scope.validateConnection = (str) => {
								
								/* Won't check options and database properly*/
								let regex = new RegExp(/^mongodb\:\/\/(?:(?:[A-Za-z0-9.]+)\:(?:[A-Za-z0-9\$\_\-\?\/\=]+)\@)?(?:[A-Za-z0-9.]+)(?:((\:)(?:[0-9]+)))?((\/)?(?:(?:[A-Za-z0-9\=\_\-\?]+)?)?)$/)
									.exec(str);
								
								if (regex) {
									
									if ($scope.toID)
										$timeout.cancel($scope.toID);
									
									$scope.toID = $timeout(
										str => {

											$scope.in_progress = true;
											$scope.__stopService();
											$scope.page.bg.db.reconnect(str);
											
										}, 4500, true, str);

								} else if ($scope.toID)
									$timeout.cancel($scope.toID);
								
							}

							self.bg.option_mgr.events
								.on('db_change',
									string => {

										$scope.in_progress = false;
										
										if (self.bg.db.connected) {
											
											$scope.string = string;
											self.bg.option_mgr.persistDBString(string);
											$timeout($scope.__updateData, 50, false, false);
												
										} else {
											
											$timeout($scope.__updateData, 50, true, true);
										}
										
									}
								)
								
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

							$scope.moveToDb = (elem, type) => {
								
								self.bg[type + '_mgr'].move2DB(elem.name)
									.then(() => {
										
										elem.in_storage = false;
										$scope.$digest();
									})
							}

							$scope.importToST = (elem, type) => {
								
								self.bg[type + '_mgr'].import2ST(elem.name)
									.then(() => {
										
										elem.in_storage = true;
										$scope.$digest();
									})
							}
							
							$scope.clearStoredData = () => {
								
								self.bg.option_mgr.clearData()
									.then(resp => {
										
										$scope.__updateData();
										
									});
							}
							
							$scope.editUserDefs = () => {

								self.bg.option_mgr.editUserDefs();

							}

							$timeout($scope.__updateService);
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

chrome.runtime.getBackgroundPage(
	page => {
			
		page.option_mgr.events = new EventEmitter();
			
		window.onbeforeunload = function () {
				
			page.option_mgr.events = null;
				
		}
			
		new OP(page);				
	});
