function OP (bg) {

	let self = this;
	
	this.bg = bg;

	this.app = angular.module('optionsPageApp', ['jslPartials', 'ui.router']);
	
	this.app.controller('optionsController', function ($scope, $timeout, $state, $stateParams) {
		
		$scope.page = self;
		$scope.data_origin = {
			
			reconnecting: false,
			available: self.bg.database_mgr.available,
			connected: self.bg.database_mgr.connected,
			writeable: self.bg.database_mgr.writeable,
			readable: self.bg.database_mgr.readable,
			string: self.bg.option_mgr.data_origin
		}
		
		
	});
	
	this.app.config(

		$stateProvider => {
			
			$stateProvider.state('opt-site', {

				resolve: {
					dataStorage: () => { return self.bg.option_mgr.getDataInfo(); },
					storageContent: () => { return browser.storage.local.get(); }
				},
				
				views: {
					
					'editor-settings': {
						
						templateUrl: 'editor-settings.html',
						controller: function ($scope, $compile) {
							
							$scope.editor_active = true;

							$scope.fonts = [
								
								"serif",
								"sans-serif",
								"monospace"
							];
							
							$scope.themes = [
								"monokai",
								"ambiance",
								"chaos", 
								"chrome",
								"clouds",
								"clouds_midnight",
								"cobalt",
								"crimson_editor",
								"dawn",
								"dreamweaver",
								"eclipse",
								"github",
								"gob", 
								"gruvbox",
								"idle_fingers",
								"iplastic",
								"katzenmilch",
								"kr_theme",
								"kuroir",
								"merbivore",
								"merbivore_soft",
								"mono_industrial",
								"pastel_on_dark",
								"solarized_dark",
								"solarized_light",
								"sqlserver",
								"terminal",
								"textmate",
								"tomorrow",
								"tomorrow_night_blue", 
								"tomorrow_night_bright",
								"tomorrow_night_eighties",
								"tomorrow_night", 
								"twilight",
								"vibrant_ink",
								"xcode"
							];

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

								{text:'Show gutter line', value: self.bg.option_mgr.editor.showGutter, id: "showGutter", type: "checkbox", change: $scope.onOptChange},
								{text:'Margin column', value: self.bg.option_mgr.editor.printMarginColumn, id: "printMarginColumn", type: "text", change: $scope.onOptChange},
								{text:'Font size', value: self.bg.option_mgr.editor.fontSize, id: "fontSize", type: "text", change: $scope.onOptChange},
								{text:'Editor theme', value: self.bg.option_mgr.editor.theme, id: "theme", type: "select", change: $scope.onOptChange},
								{text:'Font family', value: self.bg.option_mgr.editor.font, id: "font", type: "select", change: $scope.onOptChange}
							];
						}
					},
					
					'app-data': {
						
						templateUrl: 'app-data.html',
						controller: function ($scope, $compile, $rootScope, $state, $interval, $timeout,  dataStorage) {

							$scope.appdata_active = true;
							
							$scope.domains = dataStorage.domains;
							$scope.groups = dataStorage.groups;
							
							$scope.__updateService = () => {

								$scope.dataID = $interval($scope.__updateData, 3500, 0, true, true);
								
							}
							
							self.updateData = $scope.__updateData = (service) => {

								if (!service)
									$interval.cancel($scope.dataID);
								
								self.bg.option_mgr.getDataInfo()
									.then(data => {
										
										let changes = false;
										
										if (!_.isEqual($scope.domains, data.domains)) {
											
											$scope.domains = data.domains;
											changes = true;

										}
										
										if (!_.isEqual($scope.groups, data.groups)) {
											
											$scope.groups = data.groups;
											changes = true;
										}

										if (!service) {
											
											if (changes)
												$scope.$digest();											
											
											$scope.__updateService();

										} 
									});
							}
							
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
									
									if ($scope.groups.length)
										self.bg.group_mgr.pushToDB($scope.groups.map(group => { return group.name }));
									
									if ($scope.domains.length)
										self.bg.domain_mgr.pushToDB($scope.domains.map(domain => { return domain.name }));
								}

								self.query_results.length = 0;
							}

							/* Any way to get the input element as a parameter here? */
							$scope.importData = () => {
								
								let reader = new FileReader();
								
								reader.onload = function () {
									
									self.bg.option_mgr.importApp(JSON.parse(reader.result))
										.then($scope.__updateData, console.error);
									
								}
								
								reader.readAsText($("#import_data")[0].files[0]);
							}

							$scope.exportData = () => {
							
								self.bg.option_mgr.exportApp();
							}

							$scope.clearStoredData = () => {
								
								browser.storage.local.clear()
									.then($scope.__updateData);
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

							$scope.$watch(
								() => {
									return self.bg.database_mgr.available;
								},
								(nval, oval) => {

									if (nval != oval) {
										
										$scope.data_origin.available = nval;

										if ($scope.data_origin.available) {
											
											$scope.data_origin.connected = self.bg.database_mgr.connected;
											$scope.data_origin.writeable = self.bg.database_mgr.writeable;
											$scope.data_origin.readable  = self.bg.database_mgr.readable;
											
										}
										
										$rootScope.$digest();
									}	
								}
							);
							
							self.query_results = $scope.query_results = [];
							
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
									
										$scope.data_origin.available = $scope.page.bg.database_mgr.available;
										$scope.data_origin.connected = $scope.page.bg.database_mgr.connected;
										$scope.data_origin.writeable = $scope.page.bg.database_mgr.writeable;
										$scope.data_origin.readable  = $scope.page.bg.database_mgr.readable;
										
										if ($scope.data_origin.connected) {
											
											$scope.data_origin.string = string;
											self.bg.option_mgr.persistDBString(string);
											
										}
									
										$scope.data_origin.reconnecting = false;
										$scope.in_progress = false;

										$scope.query_results.length = 0;
										
										$rootScope.$digest();
									}
								)
								.on('db_query',
									results => {
										
										$scope.query_results.length = 0;
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
										
										$scope.$digest();
									}
								)
								.on('db_newdata',
									() => {
										
										$timeout(self.updateData, 350);
										
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
			
			if (!page.option_mgr.events)
				page.option_mgr.events = new EventEmitter();
			
			window.onbeforeunload = function () {
				
				page.option_mgr.events = null;
				
			}

			new OP(page);				
		}
	);
