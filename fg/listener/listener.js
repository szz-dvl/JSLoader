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

	this.requestHeaders = this.requestHeaders.map(header => { return new Header(header); }); 
};

function RequestFailure (data) {

	Request.call(this, data);

};

function RequestWrapper (data, error) {

	this.request = error ? new RequestFailure(data.request) : new Request(data.request);
	this.responses = new ResponseSequence(data.responses);
	
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
	//this.port = port;
	
	this.app = angular.module('ListenerApp', ['jslPartials', 'jsonFormatter', 'jslPartials']);

	this.app.controller('bodyController', function ($scope, $timeout) {

		$scope.label = "JSLoader";
		$scope.tabId = id;
		
	});
	
	this.app.controller('listenerController', function ($scope, $timeout, $location, $anchorScroll) {

		self.list = $scope;
		$scope.page = self;
		$scope.port = port;
		
		$scope.listener = self.bg.tabs_mgr.getListenerById(id);
		$scope.list = [];

		$scope.tapUrls = function () {
			
			$(".url").off();
			$(".url").click(ev => {
				
				ev.preventDefault();
				ev.stopImmediatePropagation();
				
				let url = $(ev.target).text().split('"')[1].toString().trim();
				
				self.bg.tabs_mgr.openOrCreateTab(url);
				
			});		
		};
		
		$scope.flushRequests = function () {

			$scope.list = [];
			
		};
		
		$scope.port.onMessage.addListener(
			args => {
				
				$scope.$$postDigest(function(){
					
					$scope.tapUrls();
					
					if ($scope.toId)
						clearTimeout($scope.toId);
					
					$scope.toId = setTimeout($scope.tapUrls, 200);
					
					$location.hash('bottom');
					$anchorScroll();
					
				});
				
				switch (args.action) {
				case "new-request":
					
					$scope.list.push(new RequestWrapper(args.request, false));
					break;
					
				case "error-request":
					
					$scope.list.push(new RequestWrapper(args.request, true));
					break;
					
				default:
					break;
				}

				$scope.$digest();
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

