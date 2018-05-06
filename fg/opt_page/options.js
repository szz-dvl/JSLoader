function OP (bg, data, content) {

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

		console.log($scope.data_origin);
	});
	
	this.app.config(

		$stateProvider => {
			
			$stateProvider.state('opt-site', {
				
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

							$scope.onOptChange = function (opt) {
								
								let aux = {};
								
								$scope.opts.forEach(
									opt => {
										
										aux[opt.id] = opt.value;
										
									});
								
								self.bg.app_events.emit("editor-preview", aux);
								
							};
							
							$scope.opts = [

								{text:'Show gutter line', value: self.bg.option_mgr.editor.showGutter, id: "showGutter", type: "checkbox", change: $scope.onOptChange},
								{text:'Margin column', value: self.bg.option_mgr.editor.printMarginColumn, id: "printMarginColumn", type: "text", change: $scope.onOptChange},
								{text:'Font size', value: self.bg.option_mgr.editor.fontSize, id: "fontSize", type: "text", change: $scope.onOptChange},
								{text:'Editor theme', value: self.bg.option_mgr.editor.theme, id: "theme", type: "select", change: $scope.onOptChange},
								{text:'Font family', value: self.bg.option_mgr.editor.font, id: "font", type: "select", change: $scope.onOptChange}
							];
							
							$scope.persistEditor = function () {
								
								console.log("Persisting editor!");
							}
						}
					},
					
					'proxy-settings': {
						
						templateUrl: 'proxy-settings.html',
						controller: function ($scope, $compile) {
							
							$scope.proxy_active = true;
							$scope.proxys = Object.keys(self.bg.option_mgr.proxys)
								.map(
									jsl_proxy => {
										
										return {
											
											name: jsl_proxy,
											host: self.bg.option_mgr.proxys[jsl_proxy].host,
											port: self.bg.option_mgr.proxys[jsl_proxy].port,
											type: self.bg.option_mgr.proxys[jsl_proxy].type
										}
									}
								);

							$scope.proxyChange = function (proxy) {
								
								console.log("Proxy changing: ");
								console.log(proxy);
								
							}
							
							$scope.addProxy = function () {

								$scope.proxys.push({ name:"", host: "", port: "", type: "" });
								
							}

							$scope.removeProxy = function (idx) {
								
								$scope.proxys.remove(idx);								
							}
							
							$scope.persistProxys = function () {

								console.log("Persisting proxys!");
								
							}
						}
					},

					'app-data': {
						
						templateUrl: 'app-data.html',
						controller: function ($scope, $compile) {
							
							$scope.appdata_active = true;
							
							$scope.domains = data.domains;
							$scope.groups = data.groups;
							
						}
					},
					
					'app-db': {
						
						templateUrl: 'app-db.html',
						controller: function ($scope, $compile, $timeout) {
							
							$scope.appdb_active = false;
							$scope.in_progress = false;
							$scope.db_query = "";
							
							$scope.query_results = [];
							
							$scope.dbQuery = function () {
								
								if ($scope.queryID)
									$timeout.cancel($scope.queryID);
									
								$scope.queryID = $timeout(
									str => {
										
										self.bg.database_mgr.queryDB($scope.db_query);
							
									}, 350, false);
								
							}
							
							$scope.updateFromDB = function (record) {

								let data = [];
								
								if (record) {

									if (record.type == "Group") {
										
										data.push(record.name);
										$scope.page.bg.database_mgr.getGroups(data);
										
									} else {
										
										data.push(record.name);
										$scope.page.bg.database_mgr.getDomains(data);
									}

								} else { 								
							
									$scope.page.bg.database_mgr.getDomains([]);
									$scope.page.bg.database_mgr.getGroups([]);
								}
								
							}

							$scope.validateConnection = function (el) {
								
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
							
							$scope.page.bg.app_events
								.on('db_change',
									string => {
									
										$scope.data_origin.available = $scope.page.bg.database_mgr.available;
										$scope.data_origin.connected = $scope.page.bg.database_mgr.connected;
										$scope.data_origin.writeable = $scope.page.bg.database_mgr.writeable;
										$scope.data_origin.readable  = $scope.page.bg.database_mgr.readable;
										
										if ($scope.data_origin.connected)
											$scope.data_origin.string = string;
									
										$scope.data_origin.reconnecting = false;
										$scope.in_progress = false;

										$scope.query_results.length = 0;
										
										$scope.$digest();
									}
								)
								.on('db_query',
									results => {
										
										$scope.query_results.length = 0;
										$scope.query_results.push.apply(
											$scope.query_results, results.map(
												instance => {
													
													return { name: instance.name, type: instance.isGroup() ? "Group" : "Domain", scripts: instance.getScriptCount(), sites: instance.sites.length };
												}
											)
										);
											
										$scope.$digest();
									}
								);
						}
					},

					'debug': {

						template: '<div ng-repeat="key in keys" style="margin-bottom: 60px; word-wrap:break-word;"><h4> {{ key }} </h4> {{ content[key] }} </div>',
						
						controller: function ($scope) {
							
							$scope.content = content;		
							$scope.keys = Object.keys($scope.content);
						}
					}					
				}
			})
		});
	
	this.app.run($state => { $state.go('opt-site') });

	angular.element(document).ready(
		() => {
			
			angular.bootstrap(document, ['optionsPageApp']);
			
		}
	);
}

browser.runtime.getBackgroundPage()
	.then(
		page => {
			page.option_mgr.getDataInfo()
				.then(
					data => {
						
						window.onbeforeunload = function () {
							
							/* Event emitter for opt page only! */
							page.app_events = null;
							page.option_mgr.onPageClose();
						}
						
						browser.storage.local.get()
							.then(
								content => {
									OP.call(this, page, data, content);
								}
							)
					}
				)
		}
	);
