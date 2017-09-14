angular.module('jslPartials', ['hljsSearch'])
	.directive('scriptList', () => {
		
		return {

			//restrict = E, signifies that directive is Element directive
			restrict: 'E',

			// require: ['hljsSearch'],
			
			scope: {
				
				list: "=list",
				parent: "=parent",
				editor: "=editor",
				port: "=port",
				shown: "=shown"
			},
			
			templateUrl: function (elem, attr) {
				return browser.extension.getURL("fg/partials/script-list.html");
			},
			
			controller: function ($scope, $timeout, $anchorScroll, $location) {

				$scope.list_uuid = UUID.generate();
				$scope.list_shown = false;
				
				console.log("New UUID for " + $scope.parent.parent.name + ": " + $scope.list_uuid);
				
				$scope.__toggleParent =  function (elem) {

					if (elem.hasClass("info-shown")) {
						
						elem.children(".script-list").find(".hidden-elem").hide();
						elem.removeClass("info-shown");
						$scope.list_shown = false;
						
					} else {
						
						elem.children(".script-list").find(".hidden-elem").show();
						elem.addClass("info-shown");
						$scope.list_shown = true;
					}
				};

				$scope.__toggleScript =  function (elem, id, cb) {

					if (elem.hasClass("script-shown")) {

						elem.find(".hidden-script").hide();
						elem.removeClass("script-shown");
						$scope.shown.remove($scope.shown.indexOf(id));
						
					} else {
						
						elem.find(".hidden-script")
							.show(
								() => {
									if (cb)
										cb();
								}
							);

						elem.addClass("script-shown");
						
						if (!$scope.shown.includes(id))
							$scope.shown.push(id);
						
					}
				};

				
				$scope.clickParent = function (ev) {
					
					var elem = $(ev.currentTarget).parent();
					
					$scope.__toggleParent(elem);
				};
				
				$scope.clickScript = function (ev) {
					
					var elem = $(ev.currentTarget).parent();

					$scope.__toggleScript(elem, ev.currentTarget.id);
				};
				
				$scope.removeScript = function (ev) {
					
					var id = ev.target.id.split("_").pop();
					$scope.list.filter(
						script => {
							
							return script.uuid == id;

						}
					)[0].remove();
					
				};
				
				$scope.editScript = function (ev) {

					var id = ev.target.id.split("_").pop();
					var script = $scope.list.filter(
						script => {
							
							return script.uuid == id;
							
						}
					)[0];
					
					$scope.editor(script);
				};


				$timeout (
					() => {

						console.log($scope.shown);
						console.log($scope.list);

						$scope.list.map (
							script => {
								
								return $scope.shown.includes(script.uuid) ? {elem: $("#" + script.uuid).parent(), uuid: script.uuid} : false;
								
							}

						).filter (
							obj => {
								
								return obj;
								
							}
							
						).forEach (
							obj => {
								if (!$scope.list_shown)
									$scope.__toggleParent($("#" + $scope.list_uuid).parent())

								$scope.__toggleScript(obj.elem, obj.uuid, () => {

									if ($scope.showTID)
										clearTimeout($scope.showTID);
									
									$scope.showTID = setTimeout(
										() => {
											
											$location.hash(obj.uuid);
											$anchorScroll();
											
										}, 100
									); 
									

								});

								
							}
						);
					}
				);
				
				if ($scope.port) {
					
					$scope.port.onMessage.addListener(

						(args) => {
							
							switch (args.action) {
								
							case "list-update":

								console.log(args.action + " for " + args.message);
								
								/* 
								   Underlying structures already updated by editor, need to trigger $scope.$digest() to re-render data however ...
								   ?? => "scriptsController" not aware of changes made in other pages, even for the same "object"??
								*/

								
								
								if (args.message == $scope.parent.parent.name) {
									
									$scope.$digest();
									
								}
								
								break;
							}	
						}
					);
				}
			}
			
		}

	});
