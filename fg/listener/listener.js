function ResponseSequence (responses) {

	this.responses = responses && responses.length
		? responses.map(
			response => {
				return new Response(response);
			}
		) : null;
};

function Header(data) {

	Object.assign(this, data);
};

function Response (data) {

	Object.assign(this, data);

	this.responseHeaders = this.responseHeaders.map(header => { return new Header(header); });
	
};

function Request (data) {

	Object.assign(this, data);

	if (this.requestHeaders)
		this.requestHeaders = this.requestHeaders.map(header => { return new Header(header); });
	
	if (this.modifiedHeaders)
		this.modifiedHeaders = this.modifiedHeaders.map(header => { return new Header(header); });
};

function RequestFailure (data) {
	
	Request.call(this, data);
};

function RequestBlocked (data) {

	Request.call(this, data);
};

function RequestRedirect (data) {

	Request.call(this, data);
};

function RequestModified (data) {

	Request.call(this, data);
};

function RequestWrapper (opt) {
	
	let self = this;
	
	this.type = opt.type;
	this.shown = opt.shown;
	this.blocked = opt.type == "blocked";
	this.routed = opt.request.proxyInfo ? true : false;
	
	this.open_lvl = 1;
	
	this.events = new EventEmitter();
	
	this.listener = opt.listener || null;
	this.adding = false;
	
	this.rules = opt.rules || [];
	this.currentRule = opt.rules.length ? opt.rules[0] : null;
	this.currentProxy = this.listener.getProxyName(opt.request.proxyInfo);
	
	switch (opt.type) {
		
	case "failured":
		this.request = new RequestFailure(opt.request);
		break;

	case "blocked":
		this.request = new RequestBlocked(opt.request);
		break;

	case "redirected":
		this.request = new RequestRedirect(opt.request);
		break;

	case "modified":
		this.request = new RequestModified(opt.request);
		break;
		
	default:
		this.request = new Request(opt.request);
		break;
	}
	
	this.responses = new ResponseSequence(opt.responses);
	
	this.blockStatus = function () {
		
		return this.blocked ? "Unblock" : "Block";
	};

	this.ruleStatus = function () {
		
		let rule = self.rules.find (
			rule => {
				return rule.id == self.currentRule.id;
			}
		);
		
		return rule ? (rule.enabled ? "Disable" : "Enable") : "Void";
	};
	
	return new listController(this);
};

function listController (data) {
	
	this.registerCrtl = function (controller) {
		
		controller.visible = true;
		controller.toggleList = function (ev) {
			
			let el = $(ev.target);
			var text;
			
			if (el.hasClass("toggler"))
				text = el.siblings(".value").find(".constructor-name").text();
			else if (el.hasClass("constructor-name")) 
				text = el.text();
			else if (el.prop("tagName") === 'A') 
				text = el.children(".value").find(".constructor-name").text();
			
			if (text) {
				if (text === this.request.constructor.name)
					controller.visible = !controller.visible;
			}
		}
		
		controller.listState = function () {
			return controller.visible ? "v" : ">";
		}
		
		return controller;
		
	};
	
	return data.constructor.name == 'Array' ?
									data.map(this.registerCrtl) :
									this.registerCrtl(data);
};


function filterGroup (conditions) {

	this.chunks = conditions.split("&&").map(chunk => { return new filterChunk(chunk.trim()); });

}

function filterChunk (filter) {
	
	for (let op of ['=', ':', '!=', '!:']) {
		
		let split = filter.split(op).map(chunk => { return chunk.trim(); });
		
		if (split.length == 2) {
			
			this.key = split[0];
			this.value = split[1] != "" ? split[1] : undefined;
			this.op = op;
		}			
	}
}

function TabListener (page) {
	
	let self = this;
	
	this.bg = page;
	this.status;
	this.list;
	
	this.app = angular.module('ListenerApp', ['jslPartials']);

	this.app.controller('bodyController', function ($scope, $timeout) {
		
		self.statu = $scope;
		$scope.page = self;
		
		$scope.label = "JSLoader";
		$scope.capture_status = 'Pause';
		$scope.tabId = $scope.page.bg.tabs_mgr.listener.id;
		$scope.url = $scope.page.bg.tabs_mgr.listener.url.hostname == "" ? "blank" : $scope.page.bg.tabs_mgr.listener.url.hostname;
		
		$scope.advFilter = "";
		$scope.currentProxy = "None";
		
		$scope.proxys = Object.keys(self.bg.option_mgr.proxys);
		$scope.proxys.push("None");
		$scope.clipped = false;
		$scope.last = {};
		
		$scope.proxyChange = function () { /* filter ?¿*/
			self.list.listener.addProxyForTab($scope.currentProxy);
		};
		
		$scope.filterOpts = [
			{
				text: "blocked",
				value: true,
				change: val => { self.list.filterChange(val, "blocked"); }
			},
			{
				text: "failured",
				value: true,
				change: val => { self.list.filterChange(val, "failured"); }
			},
			{
				text: "redirected",
				value: true,
				change: val => { self.list.filterChange(val, "redirected"); }
			},
			{
				text: "modified",
				value: true,
				change: val => { self.list.filterChange(val, "modified"); }
			},
			{
				text: "ok",
				value: true,
				change: val => { self.list.filterChange(val, "ok"); }
			}
		];
		
		$scope.toggleCapture = function () {
			
			$scope.capture_status = $scope.capture_status == 'Pause' ? 'Resume' : 'Pause';
			self.list.listener.active = $scope.capture_status == 'Pause' ? true : false;
		};

		$scope.advFilterChange = function () {
			
			if ($scope.filterID)
				clearTimeout($scope.filterID);

			$scope.filterID = setTimeout(
				() => {

					self.list.advFilterChange($scope.advFilter);
				
				}, 1200);
		}

		$scope.anyFilter = function () {

			return $scope.advFilter != "" || $scope.filterOpts.find(filter => { return !filter.value; });
			
		}

		$scope.toggleClipped = function (ev) {

			/* $(ev.currentTarget).blur(); 
			   $scope.clipped = !$scope.clipped; */
			$scope.page.bg.app_events.emit("listener-clipped", $scope.clipped);
		};
		
		$scope.page.bg.app_events.on("listener-update",
			args => {
				
				$scope.tabId = args.id;
				$scope.url = args.url == "" ? "blank" : args.url;
				
				if (args.fromPA)
					$scope.clipped = false;
				
				$scope.$digest();
			});
	});
	
	this.app.controller('listenerController', function ($scope, $timeout, $location, $anchorScroll) {

		self.list = $scope;
		
		$scope.page = self;

		$scope.gotProxys = Object.keys(self.bg.option_mgr.proxys).length;
		
		$scope.config_sel = false;
		$scope.proxying_sel = false;
		$scope.rule_sel = false;
		$scope.currentProxySel = "None";
		
		$scope.listener = self.bg.tabs_mgr.listener;
		$scope.list = [];
		$scope.currentFilter = {
			
			isEmpty: function () { return (this.groups.length == 0 ||
																 (this.groups[0].chunks.length == 1 &&
																	 ((this.groups[0].chunks[0].key == "" && typeof(this.groups[0].chunks[0].value) == 'undefined') || !Object.keys(this.groups[0].chunks[0]).length ))); },
			groups: []	
		};

		$scope.getVoidText = function () {
			
			return $scope.page.statu.anyFilter() && $scope.list.length ? 'No Match' : 'No Data';
			
		};
		
		$scope.flushRequests = function () {
			
			if ($scope.__AllShown())
				$scope.list.length = 0;
			else {
				
				let idx = $scope.list.findIndex(
					req => {
						
						return req.shown;
						
					}
				);
				
				while (idx >= 0) {
					
					$scope.list.remove(idx);
					idx = $scope.list.findIndex(
						req => {
							
							return req.shown;
							
						}
					);	
				}
			}
			
			$scope.user_moved = false;
		};

		$scope.getStatus = function (key) {
			
			return self.statu.filterOpts.find(
				filter => {
					
					return filter.text == key;
					
				}).value;
		};
		
		$scope.removeRule = function (req) {
			
			let removed = req.currentRule.id;

			for (let stacked of $scope.list) {
				
				stacked.rules.remove(
					stacked.rules.findIndex(
						rule => { return rule.id == removed; }
					)
				);
				
				stacked.currentRule = stacked.rules[0];
			}
			
			self.bg.rules_mgr.removeRule(removed);
		};

		$scope.toggleRule = function (req) {

			let toggled = req.currentRule.id;
			
			for (let stacked of $scope.list) {
				
				let rule = stacked.rules.find(
					rule => { return rule.id == toggled; }
				);

				if (rule)
					rule.enabled = !rule.enabled;
			}
			
			self.bg.rules_mgr.toggleEnable(toggled);
		};

		$scope.urlClick = function (url) {
							   
			self.bg.tabs_mgr.openOrCreateTab(url);	
			
		};
		
		$scope.downloadCapture = function () {
			
			let text = ["["];
			let info = false;
			
			for (request of $scope.list.filter(req => { return req.shown }).map(req => { return req.request; })) {

				if (!info)
					info = true;
				
				text.push(JSON.stringify(request));
				text.push(",");
			}	
			
			if (info)
				text.pop(); // last comma
			
			text.push("]");

			browser.downloads.download({ url: URL.createObjectURL( new File(text, "capture.json", {type: "application/json"}) ) });
		};
		
		$scope.filterChange = function (action, type) {
			
			if ($scope.currentFilter.isEmpty()) {
				
				for (let request of $scope.list) {
					
					if (request.type === type)
						request.shown = action;
				}
				
			} else
				$scope.__applyFilters();
		};
		
		$scope.__reqMustShow = function (req) {
			
			return $scope.currentFilter.isEmpty() ?
				   $scope.getStatus(req.type) :
				   ($scope.currentFilter.groups.find(
					   group => {
						   
						   return group.chunks.every(
							   chunk => {
								   
								   for (let key of Object.keys(req.request)) {
									   
									   if (key == chunk.key || chunk.key == "") {
										   
										   let reqval = typeof(req.request[key]) != 'undefined' ? typeof(req.request[key]) == 'string' ? req.request[key] :  JSON.stringify(req.request[key]) : 'undefined';
										   
										   switch (chunk.op) {
											   
											   case ':':
												   return (reqval.includes(chunk.value) || (reqval == 'undefined' && typeof(chunk.value) == 'undefined')) && $scope.getStatus(req.type);
											   case '=':
												   return (reqval == chunk.value || (reqval == 'undefined' && typeof(chunk.value) == 'undefined'))  && $scope.getStatus(req.type);
											   case '!:':
												   return (!reqval.includes(chunk.value) || (reqval == 'undefined' && typeof(chunk.value) != 'undefined')) && $scope.getStatus(req.type);
											   case '!=':
												   return (reqval != chunk.value || (reqval == 'undefined' && typeof(chunk.value) != 'undefined')) && $scope.getStatus(req.type);
										   } 
									   }
								   }
							   });
						   
					   }) ? true : false);
		};
		
		$scope.__applyFilters = function () {
			
			for (let req of $scope.list) {
				
				req.shown = $scope.__reqMustShow(req);
				
			}

			$scope.user_moved = false;
		};
		
		$scope.advFilterChange = function (filter) {

			$scope.currentFilter.groups = filter.split("||").map(chunk => { return new filterGroup(chunk.trim()); });
			
			$scope.__applyFilters();
			
			$scope.$digest();
		};
		
		$scope.__AllShown = function () {
			
			return typeof(
				$scope.list.find(
					request => {
						
						return !request.shown; 
						
					}
				
				)) == 'undefined';
		};

		$scope.btnStatus = function () {
			
			return $scope.__AllShown() ? "All" : "Selection";
			
		};
		
		$scope.infoShown = function () {
			
			return $scope.list.find(
				request => {
					
					return request.shown == true;
					
				}
				
			) ? true : false;
		};
		
		$scope.configSelection = function () {
			$scope.config_sel = true; 
		};
		
		$scope.showRuleSel = function () {
			$scope.rule_sel = true; 
		};
		
		$scope.persistRuleSel = function (action, data) {
			
			$scope.list.filter(
				stacked => {
					
					return stacked.shown ? stacked : false;
					
				}).forEach(
					stacked => {
						
						$scope.listener.addFilter(stacked.request,
							{
								action: action,
								data: data,
							});
					});
			
			$scope.rule_sel = false;
			
			if (!$scope.proxying_sel)
				$scope.config_sel = false;
		};
		
		$scope.dismissRuleSel = function () {
			
			$scope.rule_sel = false;
			
			if (!$scope.proxying_sel)
				$scope.config_sel = false;
		};
		
		$scope.showProxySel = function () {
			
			$scope.proxying_sel = true;
		};

		$scope.proxySelChange = function () {
			
			$scope.list.map(
				stacked => {

					let url = new URL(stacked.request.url);
					
					return stacked.shown ? url.protocol + "//" + url.hostname : false;
					
				})
				.filter(host => { return host; })
				.filter(
					(host, idx, arr) => {
						
						return arr.indexOf(host) == idx ? host : false;
						
					}).forEach(
						uniq => {
							
							$scope.listener.addProxyForHost($scope.currentProxySel, uniq);
						}
					);
			
			$scope.proxying_sel = false;
			
			if (!$scope.rule_sel)
				$scope.config_sel = false;
		}
		
		$scope.dismissProxySel = function () {
			
			$scope.proxying_sel = false;
			
			if (!$scope.rule_sel)
				$scope.config_sel = false;	
		}
		
		$scope.page.bg.app_events.on("listener-view",
			args => {
				
				switch (args.action) {
					case "new-request":
						
						args.request.type = "ok";
						break;
						
					case "error-request":
						
						args.request.type = "failured";
						break;
						
					case "blocked-request":
						
						args.request.type = "blocked";
						break;

					case "redirect-request":
						
						args.request.type = "redirected";
						break;
						
					case "modified-request":
						
						args.request.type = "modified";
						break;
						
					default:
						break;
				}
				
				
				args.request.listener = $scope.listener;
				args.request.shown = $scope.__reqMustShow(args.request);
				$scope.list.push(new RequestWrapper(args.request));
				
				$scope.$digest();
				
				if (!$scope.user_moved) {
					
					$location.hash("bottom");
					$anchorScroll();
				}
			});
		
		$timeout(() => {
			
			$('#content').mousedown(
				ev => {
					
					if( $(window).outerWidth() <= ev.clientX ){
						
						$scope.user_moved = true;
						
					}
					
				});
			
			$('#content').on('wheel', ev => {
				
				$scope.user_moved = true;
				
			});
		})
	});
	
	angular.element(document).ready(
		() => {
			
			angular.bootstrap(document, ['ListenerApp']);
			
		}
	);
}


browser.runtime.getBackgroundPage()
	.then(
		page => {
			
			window.onbeforeunload = function () {
				
				page.app_events = null; /* If not done next access will find DeadObject */
				page.tabs_mgr.listenerClose();
				
			};
			
			TabListener.call(this, page);
		},
	);

