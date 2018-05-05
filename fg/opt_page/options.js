function OP (bg) {

	let self = this;
	
	this.bg = bg;
	
	this.app = angular.module('optionsPageApp', ['jslPartials', 'ui.router']);
	
	this.app.controller('optionsController', function ($scope, $timeout, $state, $stateParams) {
		
		$scope.page = self;
			
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
							
							
						}
					},
					
					'app-db': {
						
						templateUrl: 'app-db.html',
						controller: function ($scope, $compile) {

							
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
			
			OP.call(this, page);
		}
	);
