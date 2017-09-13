angular.module('jslScriptList', ['hljsSearch'])
	.directive('scriptList', () => {
		
		return {

			//restrict = E, signifies that directive is Element directive
			restrict: 'E',

			// require: ['hljsSearch'],
			
			scope: {
				
				list: "=list",
				parent: "=parent",
				editor: "=editor"

			},
			
			templateUrl: function (elem, attr) {
				return browser.extension.getURL("fg/partials/script-list/script-list.html");
			},
			
			controller: function ($scope) {
				
				$scope.clickParent = function (ev) {

					var elem = $(ev.currentTarget).parent();
					
					if (elem.hasClass("info-shown")) {
						
						elem.children(".script-list").find(".hidden-elem").hide();
						elem.removeClass("info-shown");
						
					} else {
						
						elem.children(".script-list").find(".hidden-elem").show();
						elem.addClass("info-shown");
						
					}	
				};
				
				$scope.clickScript = function (ev) {
					
					var elem = $(ev.currentTarget).parent();
					
					if (elem.hasClass("script-shown")) {

						elem.find(".hidden-script").hide();
						elem.removeClass("script-shown");
						
					} else {
						
						elem.find(".hidden-script").show();
						elem.addClass("script-shown");
					}
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
							
						})[0];
					
					$scope.editor(script);
				};
			}
			
		}

	});
