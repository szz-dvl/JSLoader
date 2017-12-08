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
	
	if (this.changedHeaders)
		this.changedHeaders = this.changedHeaders.map(header => { return new Header(header); });
};

function RequestFailure (data) {
	
	Request.call(this, data);

};

function RequestBlocked (data) {

	Request.call(this, data);

};

function RequestWrapper (opt) {

	this.type = opt.type;
	this.shown = opt.shown;
	this.blocked = opt.type == "blocked";
	
	switch (opt.type) {

	case "failured":
		this.request = new RequestFailure(opt.request);
		break;

	case "blocked":
		this.request = new RequestBlocked(opt.request);
		break;
		
	default:
		this.request = new Request(opt.request);
		break;
	}
	
	this.responses = new ResponseSequence(opt.responses);

	this.blockStatus = function () {

		return this.blocked ? "Unblock" : "Block";
		
	}
	
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
	
	return data.constructor.name == 'Array'
		? data.map(this.registerCrtl)
		: this.registerCrtl(data);
};

function TabListener (id, page, port) {
	
	let self = this;
	
	this.bg = page;
	this.status;
	this.list;
	
	this.app = angular.module('ListenerApp', ['jslPartials', 'jsonFormatter', 'jslPartials']);

	this.app.controller('bodyController', function ($scope, $timeout) {

		self.statu = $scope;
		
		$scope.label = "JSLoader";
		$scope.capture_status = 'Pause';
		$scope.tabId = id;
		$scope.advFilter = "";

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

			$scope.filterID = setTimeout(() => {

				self.list.advFilterChange($scope.advFilter);
				
			}, 800);

		}
			
	});
	
	this.app.controller('listenerController', function ($scope, $timeout, $location, $anchorScroll) {

		self.list = $scope;
		
		$scope.page = self;
		$scope.port = port;
		
		$scope.listener = self.bg.tabs_mgr.getListenerById(id);
		$scope.list = [];
		$scope.currentFilter = {
			
			key: "",
			value: "",
			isEmpty: () => { return this.key == "" && this.value == ""; }

		}
		
		$scope.flushRequests = function () {
			
			$scope.list.length = 0;
			
		};

		$scope.getStatus = function (key) {
			
			return self.statu.filterOpts.find(
				filter => {
					
					return filter.text == key;
					
				}).value;
		};
		
		$scope.blockOps = function (req) {

			if (req.blocked)
				$scope.listener.removeFilter(req.request);
			else
				$scope.listener.addFilter(req.request);

		};
		
		$scope.urlClick = function (url) {
			
			self.bg.tabs_mgr.openOrCreateTab(url);	

		};
		
		$scope.downloadCapture = function () {
			
			let text = ["["];
			
			for (request of $scope.list) {
				
				text.push.apply(text, [JSON.stringify(request)]);
				text.push(",");
			}	
			
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

			if ($scope.currentFilter.key != "") {
				
				for (let key of Object.keys(req.request)) {
					
						if (key == $scope.currentFilter.key) {
							if (typeof(req.request[key]) != 'undefined') {
								return (
									(
										(
											typeof(req.request[key]) == 'string'
												? req.request[key] == $scope.currentFilter.value
												: JSON.stringify(req.request[key]) == $scope.currentFilter.value) || ($scope.currentFilter.value == "" && !req.request[key])
									
									) && $scope.getStatus(req.type)
								);
								
							} else
								return ($scope.currentFilter.value == 'undefined' || $scope.currentFilter.value == '') && $scope.getStatus(req.type);
						}
				}

			} else
				return $scope.currentFilter.value == "" ? $scope.getStatus(req.type) : false;
			
		};
		
		$scope.__applyFilters = function () {

			//$scope.listener.printFilters();
			
			for (let req of $scope.list) {
				
				req.shown = $scope.__reqMustShow(req);
				
			} 
		};
		
		$scope.advFilterChange = function (filter) {

			
			let split = filter.split(":").map(chunk => { return chunk.trim(); });
			
			$scope.currentFilter.key = split[0];
			$scope.currentFilter.value = split.slice(1).join(":");
			
			$scope.__applyFilters();
			
			$scope.$digest();
		};

		$scope.infoShown = function () {

			return $scope.list.find(
				request => {

					return request.shown == true;

				}
			) || false;
		};

		$scope.noBlocked = function () {
			
			return typeof($scope.list.find(
				request => {
					
					return request.shown == true && request.type == "blocked";
					
				}
			)) == 'undefined' && $scope.infoShown();
		};
		
		$scope.noUnblocked = function () {
			
			return typeof($scope.list.find(
				request => {
					
					return request.shown == true && request.type != "blocked";
					
				}
			)) == 'undefined' && $scope.infoShown();
		};

		$scope.un_blockSelection = function () {

			return $scope.list.filter(
				request => {

					return request.shown == true;

				}
			).forEach($scope.blockOps);
		};
		
		$scope.port.onMessage.addListener(
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
					
				default:
					break;
				}

				args.request.shown = $scope.__reqMustShow(args.request);
				$scope.list.push(new RequestWrapper(args.request));
				
				$scope.$digest();
				$location.hash("bottom");
				$anchorScroll();
			}
		);
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
			
			let id = parseInt(window.location.toString().split("?")[1].split("&")[0]);
			let port = browser.runtime.connect({name:"tab-listener-" + id}); //browser.runtime.id, 
			
			window.onbeforeunload = function () {
				
				page.tabs_mgr.listenerClose(id);
				port.disconnect();
				
			};
			
			TabListener.call(this, id, page, port);
			
		},
	);

