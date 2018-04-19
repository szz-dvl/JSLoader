function Option (opt, section) {

	var self = this;
	
	this.text = opt.text || "";
	this.type = opt.type || "checkbox";
	this.id = opt.id || null;
	this.value = opt.value || false;
	this.shown = opt.shown;
	
	this.__onChange = opt.change || null;
	this.sub_opts = opt.subopts ?
		opt.subopts.map(
			opt => {
				
				opt.shown = self.value;
				return new Option(opt, section);	
			}
		) : [];

	this.change = function () {

		section[self.id] = self.value;

		if (self.__onChange)
			self.__onChange(self);

		for (subopt of self.sub_opts) { 

			if (self.value)
				subopt.show();
			else
				subopt.hide();
		}
	};
	
	this.setVal = function (value) {
		
		section[self.id] = self.value = value;
		
		console.log("Opt " + self.id + " setting value to: " + self.value);
		
	};

	/* Subopts */
	this.show = function () {

		self.shown = true;
	};

	this.hide = function () {

		self.shown = false;
	};

}

function OP (bg, port) {
	
	let self = this;
	
	this.bg = bg;
	this.port = port;
	
	this.domain_list;
	this.group_list;
	this.themes;
	this.settings;
	this.tabs;
	
	this.app = angular.module('OptionsApp', ['jslPartials', 'ui.router']); 
	
	this.app.controller('tabsController', function ($scope, $timeout, $state) {
		
		self.tabs = $scope;
		$scope.page = self;
		
		$scope.active;
		$scope.import_data_button = false;
		$scope.db_buttons = $scope.page.bg.database_mgr.available;
		
		$scope.tabs = [
			
			{sref: 'settings', title: 'Settings'},
			{sref: 'domains', title: 'Domains'}, 
			{sref: 'groups', title: 'Groups'}, 
			{sref: 'userdefs', title: 'Userdefs'},
			{sref: 'rules', title: 'Rules'},
			{sref: 'logs', title: 'Logs'},
			{sref: 'storage', title: 'Storage'}
		];
		
		//ui-sref
		$scope.setActive = function (tab) {
			
			$("#tab-" + tab).siblings('.td-tab-link').removeClass("active");
			$("#tab-" + tab).addClass("active");
			
			$scope.active = tab;
			$scope.import_data_button = false;
		};
		
		$scope.inoutOk = function () {
			
			return ['domains', 'groups', 'rules'].includes($scope.active);
			
		}

		$scope.databaseOk = function () {
			
			return $scope.db_buttons && ['domains', 'groups'].includes($scope.active);
			
		}

		$scope.dbFeed = function () {

			switch ($scope.active) {

				case "domains":
					$scope.page.bg.database_mgr.getDomains();
					break;;
				case "groups":
					$scope.page.bg.database_mgr.getGroups();
					break;;
				default:
					break;;
			}
		}
		
		$scope.dbPush = function () {
			
			switch ($scope.active) {
				
				case "domains":
					$scope.page.bg.database_mgr.pushDomains();
					break;;
				case "groups":
					$scope.page.bg.database_mgr.pushGroups();
					break;;
				default:
					break;;
			}
		}
		
		$scope.applyDataImport = function (ev) {
			
			let reader = new FileReader();
			
			reader.onload = function () {
				
				switch ($scope.active) {
					case "domains":
						$scope.page.bg.domain_mgr.importDomains(JSON.parse(reader.result));
						break;;
					case "groups":
						$scope.page.bg.group_mgr.importGroups(JSON.parse(reader.result));
						break;;
					case "rules":
						$scope.page.bg.rules_mgr.importRules(JSON.parse(reader.result));
						break;;
				}
				
				$scope.import_data_button = false;
				$scope.$digest();
			}
			
			reader.readAsText($("#import_data")[0].files[0]);
		};
		
		$scope.dataExport = function (ev) {
			
			reader.onload = function () {
				
				switch ($scope.active) {
					case "domains":
						$scope.page.bg.domain_mgr.exportScripts();
						break;;
					case "groups":
						$scope.page.bg.group_mgr.exportGroups();
						break;;
					case "rules":
						$scope.page.bg.rules_mgr.exportRules();
						break;;
				}
			}
		};
		
		$scope.dataFile = function (ev) {
			
			$scope.import_data_button = true;
			$scope.$digest();
			
		};

		$timeout(() => {
			
			$("#import_data").on('change', $scope.dataFile);
			
		});
	});
	
	this.app.controller('userdefsController', function ($scope) {
		
		self.tabs.setActive('userdefs');
		
		$scope.page = self;
		$scope.defs_shown = true;
		$scope.globs_shown = true;
		
		$scope.toggleDefs = function () {
			
			$scope.defs_shown = !$scope.defs_shown;

		};

		$scope.statusDefs = function () {
			
			return $scope.defs_shown ? "v" : ">";
			
		};

		$scope.toggleGlobs = function () {

			$scope.globs_shown = !$scope.globs_shown;
			
		};
		
		$scope.statusGlobs = function () {

			return $scope.globs_shown ? "v" : ">";

		};
		
	});
	
	
	this.app.controller('themeController', ($scope, $compile) => {
		
		self.themes = $scope;
		$scope.page = self;
		
		/* Ace editor rules here, highlightjs will share theme if available */
		$scope.list = [
			
			{name: "monokai", knownToHl: "monokai-sublime", title: "Hightlights available"}, /* "monokai-sublime" */
			{name: "ambiance", knownToHl: false, title: "Hightlights unavailable"},
			{name: "chaos", knownToHl: false, title: "Hightlights unavailable"},
			{name: "chrome", knownToHl: false, title: "Hightlights unavailable"},
			{name: "clouds", knownToHl: false, title: "Hightlights unavailable"},
			{name: "clouds_midnight", knownToHl: false, title: "Hightlights unavailable"},
			{name: "cobalt", knownToHl: false, title: "Hightlights unavailable"},
			{name: "crimson_editor", knownToHl: false, title: "Hightlights unavailable"},
			{name: "dawn", knownToHl: false, title: "Hightlights unavailable"},
			{name: "dreamweaver", knownToHl: false, title: "Hightlights unavailable"},
			{name: "eclipse", knownToHl: false, title: "Hightlights unavailable"},
			{name: "github", knownToHl: "github", title: "Hightlights available"},
			{name: "gob", knownToHl: false, title: "Hightlights unavailable"},
			{name: "gruvbox", knownToHl: "gruvbox-dark", title: "Hightlights available"},
			{name: "idle_fingers", knownToHl: false, title: "Hightlights unavailable"},
			{name: "iplastic", knownToHl: false, title: "Hightlights unavailable"},
			{name: "katzenmilch", knownToHl: false, title: "Hightlights unavailable"},
			{name: "kr_theme", knownToHl: false, title: "Hightlights unavailable"},
			{name: "kuroir", knownToHl: false, title: "Hightlights unavailable"},
			{name: "merbivore", knownToHl: false, title: "Hightlights unavailable"},
			{name: "merbivore_soft", knownToHl: false, title: "Hightlights unavailable"},
			{name: "mono_industrial", knownToHl: false, title: "Hightlights unavailable"},
			{name: "pastel_on_dark", knownToHl: false, title: "Hightlights unavailable"}, 
			{name: "solarized_dark", knownToHl: "solarized-dark", title: "Hightlights available"},
			{name: "solarized_light", knownToHl: "solarized-light", title: "Hightlights available"},
			{name: "sqlserver", knownToHl: false, title: "Hightlights unavailable"},
			{name: "terminal", knownToHl: false, title: "Hightlights unavailable"},
			{name: "textmate", knownToHl: false, title: "Hightlights unavailable"},
			{name: "tomorrow", knownToHl: "tomorrow", title: "Hightlights available"},
			{name: "tomorrow_night_blue", knownToHl: "tomorrow-night-blue", title: "Hightlights available"},
			{name: "tomorrow_night_bright", knownToHl: "tomorrow-night-bright", title: "Hightlights available"},
			{name: "tomorrow_night_eighties", knownToHl: "tomorrow-night-eighties", title: "Hightlights available"},
			{name: "tomorrow_night", knownToHl: "tomorrow-night", title: "Hightlights available"},
			{name: "twilight", knownToHl: false, title: "Hightlights unavailable"},
			{name: "vibrant_ink", knownToHl: false, title: "Hightlights unavailable"},
			{name: "xcode", knownToHl: "xcode", title: "Hightlights available"}
			
		];
		
		$scope.getTheme = function (name) {
			
			return $scope.list.filter(
				theme => {
					return theme.name == name;
				}
			)[0] || null;
		};
		
		/* Import */
		$scope.setTheme = function (name) {

			$scope.current = $scope.list.filter(
				theme => {
					return theme.name == name;	
				}
			)[0] || null;

			$scope.page.bg.option_mgr.editor.theme.update($scope.current);
			$scope.$digest();
		};
		
		$scope.current = $scope.getTheme($scope.page.bg.option_mgr.editor.theme.name);
		
		$scope.themeChange = function () {
			
			let link = $scope.current.knownToHl ?
					   '<link rel="stylesheet" ng-href="http://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/{{current.knownToHl}}.min.css">' :
					   '<link rel="stylesheet" ng-href="../deps/highlightjs/default.min.css">';
			
			$('link')
				.find('[ng-href]')
				.replaceWith($compile(link)($scope));
		};	
	});
	
	this.app.controller('settingsController', function ($scope, $timeout, dataOpts) {
		
		self.tabs.setActive('settings');
		
		self.settings = $scope;
		
		$scope.opts = dataOpts;
		
		$scope.page = self;
		$scope.port = port;
		$scope.title = "Settings";
		$scope.data_origin_ok = $scope.page.bg.database_mgr.available;
		
		$scope.proxys_shown = true;
		$scope.import_app_button = false;
		
		$scope.toggleProxys = function () {
			
			$scope.proxys_shown = !$scope.proxys_shown;
		};
		
		$scope.statusProxys = function () {
			
			return $scope.proxys_shown ? "v" : ">";	
		};
		
		$scope.submenus = [
			{
				key: 'editor',
				title: "Editor Settings",
				opts: [
					
					new Option({text:'Print margin line', value: $scope.opts.editor.showPrintMargin, type: "checkbox", id: "showPrintMargin"}, $scope.opts.editor),
					new Option({text:'Collapse header by default', value: $scope.opts.editor.collapsed, type: "checkbox", id: "collapsed"}, $scope.opts.editor),
					new Option({text:'Show gutter line', value: $scope.opts.editor.showGutter, type: "checkbox", id: "showGutter"}, $scope.opts.editor),
					
					new Option({text:'Font size', value: $scope.opts.editor.fontSize, type: "text", id: "fontSize",
						change: that => {
							
							if (that.ToID)
								clearTimeout(that.ToID);
							
							that.ToID = setTimeout(
								() => {
									$('code').each(
										(i, block) => {
											$(block).css("font-size", $scope.opts.editor.fontSize + "pt");
										}
									);									
								}, 1000
							);
							
						}}, $scope.opts.editor
					)
				]
			}
		];
		
		$scope.applyAppImport = function (ev) {
			
			ev.preventDefault();
			
			let reader = new FileReader();
			
			reader.onload = function () {
				
				$scope.page.bg.option_mgr.importApp(JSON.parse(reader.result));
				$scope.import_app_button = false;
				$scope.$digest();
			}
			
			reader.readAsText($("#import_app")[0].files[0]);
		};
		
		$scope.AppExport = function (ev) {
			
			ev.preventDefault();
			
			$scope.page.bg.option_mgr.exportApp();	
		};
		
		$scope.appFile = function (ev) {
			
			$scope.import_app_button = true;
			$scope.$digest();
			
		};
		
		$scope.updtOpts = function() {
			
			let theme = {};
			
			theme.name = $scope.page.themes.current.name;
			theme.knownToHl = $scope.page.themes.current.knownToHl;
			theme.title = $scope.page.themes.current.title;
			
			$scope.opts.editor.theme = theme;
			$scope.opts.jsl.data_origin = $("#data-origin-inpt").val();
			
			$scope.page.bg.option_mgr.persist($scope.opts); /* !!! */

		};
		
		$timeout(
			() => {
				
				$("#import_app").on('change', $scope.appFile);
			}
		);
	});

	this.app.controller('domainController', function ($scope, $timeout, dataDomains) {

		self.tabs.setActive('domains');
		
		$scope.page = self;
		$scope.page.domain_list = $scope;
		$scope.port = port;
		$scope.domains = dataDomains;
		
		$scope.shown = [];
		
		$scope.title = "Stored scripts";
		
		/* Redo! */
		$scope.port.onMessage.addListener(

			(args) => {
				
				switch (args.action) {
					
				case "cache-update-domains":
					
					/* To event emitter. */
					$scope.port.postMessage({action: "list-update", message: args.message});
					$scope.$digest();
					
					break;
				}
			}
		);
	});
	
	this.app.controller('groupController', function ($scope, $timeout, dataGroups) {

		self.tabs.setActive('groups');
		
		$scope.page = self;
		$scope.page.group_list = $scope;
		
		$scope.port = port;
		$scope.groups = dataGroups;
		
		$scope.shown = [];	
	});
	
	this.app.config(
		$stateProvider=> {
			
			$stateProvider.state({
				
				resolve: {
					dataDomains: () => {
						return new Promise (
							resolve => {
								
								self.bg.domain_mgr.getMissingItems()
									.then(resolve);
								
							})
					}
				},
				
				name: 'domains',
				templateUrl: 'domains.html',
				controller: "domainController"
			});

			$stateProvider.state({
				
				resolve: {
					dataRules: () => {
						return { rules: self.bg.rules_mgr.rules.filter(rule => {return !rule.temp; }), proxys: self.bg.rules_mgr.proxy_rules.filter(rule => {return !rule.temp; }) };
					}	
				},
				
				name: 'rules',
				templateUrl: 'rules.html',
				
				controller: function ($scope, $state, $stateParams, $timeout, dataRules) {
					
					self.tabs.setActive('rules');

					$scope.state = $state
					$scope.title = "Stored rules";
					$scope.rules = dataRules.rules;
					$scope.proxy_rules = dataRules.proxys;
					$scope.names = Object.keys(self.bg.option_mgr.jsl.proxys);
					
					$scope.proxy_shown = $stateParams["#"] == "proxy" ? true : false;
					$scope.req_shown = $stateParams["#"] == "rules" ? true : false;
					$scope.mgr = self.bg.rules_mgr;
					
					$scope.addRule = function () {
						
						$scope.mgr.addRule({});

						$state.transitionTo($state.current, {"#": "rules"}, { 
							reload: true, inherit: false, notify: false 
						});
					};

					$scope.addProxyRule = function () {
						
						$scope.mgr.proxyFactory();
						
						$state.transitionTo($state.current, {"#": "proxy"}, { 
							reload: true, inherit: false, notify: false 
						});
						
					};

					$scope.toggleProxy = function () {

						$scope.proxy_shown = !$scope.proxy_shown;
						
					}

					$scope.statusProxy = function () {

						return $scope.proxy_shown ? 'v' : '>';

					}

					$scope.toggleReq = function () {

						$scope.req_shown = !$scope.req_shown;

					}

					$scope.statusReq = function () {

						return $scope.req_shown ? 'v' : '>';
						
					}
				}
			});
			
			$stateProvider.state({
				
				resolve: {
					dataOpts: () => { return { editor: self.bg.option_mgr.editor, jsl: self.bg.option_mgr.jsl }; } 
				},
				
				name: 'settings',
				templateUrl: 'settings.html',
				controller: "settingsController"

			});

			$stateProvider.state({
				
				name: 'userdefs',
				templateUrl: 'userdefs.html',
				controller: "userdefsController"
				
			});

			$stateProvider.state({

				resolve: {
					dataGroups: () => {
						return new Promise (
							resolve => {
								
								self.bg.group_mgr.getMissingItems()
									.then(resolve);
							})
					}
				},
				
				name: 'groups',
				templateUrl: 'groups.html',
				controller: 'groupController'
				
			});

			$stateProvider.state({

				resolve: {
					dataLogs: () => { return self.bg.logs_mgr.logs; }
				},
				
				name: 'logs',
				templateUrl: 'logs.html',
				
				controller: function ($scope, $state, dataLogs) {
					
					self.tabs.setActive('logs');
					
					$scope.page = self;
					$scope.logs = dataLogs.sort((x,y) => { return y.stamp - x.stamp; });
					
					$scope.openEditor = function (ev, log) {
						
						$scope.page.bg.logs_mgr.openOffender(log.parent, log.offender, log.line, log.col)
							.then(null,
								  err => {

									  log.removed = true;
									  $(ev.target).text("Removed");
									  $scope.$digest();
									  
								  });
						
					};
					
					$scope.showDefs = function () {
						
						$state.go("userdefs");
						
					};	
				}
				
			});

			$stateProvider.state({
				
				resolve: {
					dataStorage: browser.storage.local.get
				},
				
				name: 'storage',
				template: '<div ng-repeat="key in keys" style="margin-bottom: 60px;"><h4> {{ key }} </h4> {{ content[key] }} </div>',
				
				controller: function ($scope, dataStorage) {
					
					self.tabs.setActive('storage');
					
					$scope.content = dataStorage;

					$scope.keys = Object.keys($scope.content);
				}
				
			});
		}
	);

	this.app.run($state => { $state.go('domains') });
	
	angular.element(document).ready(
		() => {
			
			angular.bootstrap(document, ['OptionsApp']);
			
		}
	);
}

browser.runtime.getBackgroundPage()
	.then(
		page => {

			window.onbeforeunload = function () {
				
				port.disconnect();

			}

			OP.call(this, page, browser.runtime.connect(browser.runtime.id, {name:"option-page"}));
			
		}
	);		

