angular.module('jslPartials', ['hljsSearch', 'jsonFormatter', 'angucomplete-alt'])

	.directive('noInfo',
			   () => {
				   
				   return {
					   restrict: 'E',
					   replace: true,
					   scope: {
						   text: "=?"
					   },
					   template : '<div class="noInfoContainer"> {{ text || "No Data" }} </div>'
				   }
			   })

	.directive('scriptName',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   script: "=script",
						   parent: "=parent"
					   },
					   
					   template: '<bdi contenteditable="true"> {{script.name}} </bdi>',
					   
					   link: function($scope, element, attr) {
						   
						   element.on('input', function(ev) {
							   
							   if ($scope.tID)
								   clearTimeout($scope.tID);
							   
							   $scope.tID = setTimeout(
								   ev => {

									   let name = $(ev.target).text().trim();
									   
									   if (name.match(/^[a-z0-9]+$/i)) {

										   $scope.script.name = name;
										   $scope.script.persist();
										   
									   } else 
										   $(ev.target).text($scope.script.name);
									   
								   }, 1000, ev
							   );
						   });
						   
						   element.keypress(ev => { return ev.which != 13; });
						   
						   element.on('click', ev => {
						   	   
							   if (ev.pageX > element.width()) {
								    
								   if (element.hasClass("shown"))
									   element.removeClass("shown");
								   else
									   element.addClass("shown");
								   
							   } else 
								   ev.stopImmediatePropagation();							      
						   });
					   }
				   }
			   })

	.directive('scriptIndex',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   scope: {
						   
						   list: "=list",
						   parent: "=?parent",
						   editor: "=editor",
						   shown: "=shown",
						   opts: "=opts",
						   pa: "=pa",
						   uuid: "=?uuid",
						   external: "=?external"
					   },

					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/script-index.html");
					   },
					   
					   controller: function ($scope, $timeout) {

						   if (!$scope.parent)
							   $scope.parent = $scope.list[0].parent;
						   
						   if ($scope.parent.isGroup())
							   $scope.parent.elems = [];
						   
						   $scope.list_uuid = $scope.uuid || UUID.generate();
						   
						   $scope.parent.insertElem($scope.list_uuid, $scope.shown);
						   
						   $scope.list = $scope.list.map(
						   	   script => {
								   
								   /* Either this or remove script from shown list on script removal ... */
								   var elem = script.insertElem($scope.list_uuid, $scope.shown);
								   
								   if (elem.shown)
									   $scope.parent.elemFor($scope.list_uuid).show();
								   
								   return script;
						   	   }
						   );
						   
						   $scope.removeScript = function(script) {

							   var url = script.getUrl(); 
							   script.remove();
							   
							   if (url)
								   $scope.pa(url.href); /* Solve for groups: URL array. */
							   
						   };
						   
						   //console.log("New UUID for " + $scope.parent.parent.name + ": " + $scope.list_uuid);
						   
						   $timeout(() => {
							   
							   $('#' + $scope.list_uuid).find('code').each(
								   (i, block) => {
									   $(block).css("font-size", $scope.opts.fontSize + "pt");
								   }
							   );
						   });
					   } 
				   }
			   })

	.directive('httpRequest',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   replace: true,
					   
					   scope: {
						   req: '=',
						   urlclick: '=',
						   toggle: '=',
						   remove: '=',
						   proxys: '='
					   },

					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/http-request.html");
					   },
					   
					   controller: function ($scope) {

						   $scope.proxying = false;
						   $scope.currentProxy = $scope.req.currentProxy;
						   $scope.open_lvl = 1;
						   $scope.config = false;
						   
						   $scope.showConfig = function () {

							   $scope.config = true;
							   
						   };
						   
						   $scope.showRuleAdder = function (req) {
							   
							   $scope.open_lvl = 2;
							   $scope.req.adding = true;
							   
						   };
						   
						   $scope.persistRule = function (action, data, headers) {
							   
							   $scope.open_lvl = 1;
							   $scope.req.listener.addFilter($scope.req.request,
															 {
																 action: action,
																 data: data,
																 headers: headers 
															 });
							   $scope.req.adding = false;
							   
							   if (!$scope.proxying)
								   $scope.config = false;
						   };

						   $scope.dismissRule = function () {

							   $scope.open_lvl = 1;
							   $scope.req.adding = false;
							   
							   if (!$scope.proxying)
								   $scope.config = false;
						   };

						   $scope.proxyChange = function () {
							   
							   $scope.req.listener.addProxyForHost($scope.currentProxy, $scope.req.request.url);
							   $scope.proxying = false;

							   if (!$scope.req.adding)
								   $scope.config = false;
						   };

						   $scope.showProxyOps = function () {
							   
							   $scope.proxying = true;
						   };

						   $scope.dismissProxy = function () {
							   
							   $scope.proxying = false;

							   if (!$scope.req.adding)
								   $scope.config = false;
						   };
					   }
				   }
			   })

	.directive('ruleAdder',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   req: '=',
						   dismiss: '=',
						   add: '=',
					   },
					   
					   template: '<rule-chooser policies="policies" add="persist" dismiss="dismiss"></rule-chooser>',
					   
					   controller: function ($scope) {
						   
						   $scope.policies = ['block', 'redirect'];
						   $scope.headers = [];
						   
						   if ($scope.req)
							   $scope.policies.push('headers only');
						   
						   $scope.persist = function (policy, data) {

							   $scope.add(
								   policy,
								   data,
								   $scope.headers
							   )
						   };
						   
						   if ($scope.req) {
							   
							   $scope.req.events.on('header-change', (text, name) => {
								   
								   let stored = $scope.headers.find(
									   header => {

										   return header.name == name;
										   
									   }
								   );

								   if (stored)
									   stored.text = text;
								   else
									   $scope.headers.push({ name: name, value: text });
								   
							   });
						   }
					   },
				   }
			   })

	.directive('ruleChooser',
		() => {
			
			return {
				
				restrict: 'E',
				
				scope: {
					policies: '=',
					events: '=?',
					dismiss: '=?',
					add: '=?',
					url: '=?',
					policy: '=?',
				},
				
				templateUrl: function (elem, attr) {
					return browser.extension.getURL("fg/partials/rule-chooser.html");
				},
				
				controller: function ($scope) {
					
					$scope.policy = $scope.policy || 'block';
					$scope.backup = '';
					$scope.validated = $scope.url ? true : false;
					$scope.redirectUrl = $scope.url || '';
					
					$scope.urlChange = function () {
						
						$scope.validated = false;
						
						if($scope.ID)
							clearTimeout($scope.ID);
						
						$scope.ID = setTimeout(
							() => {
								
								if ($scope.redirectUrl != "") { 
										   
									try {
											   
										let url = new URL($scope.redirectUrl.startsWith("http") ? $scope.redirectUrl : "http://" + $scope.redirectUrl);
										
										$scope.redirectUrl = url.href;
										$scope.backup = $scope.redirectUrl;
											   
									} catch (e) {
										
										if (e instanceof TypeError) {
											
											console.error(e);
											$scope.redirectUrl = $scope.backup;
										}
									}
									
									$scope.validated = true;
									$scope.$digest();
										   
								} else
								$scope.validated = false;
									   
							}, 2000
						);
					};
					
					$scope.selectChange = function () {
						
						$scope.redirectUrl = "";
						
					};
					
					$scope.persist = function () {
						
						$scope.add(
							$scope.policy.split(' ')[0],
							($scope.policy == 'redirect' ? $scope.redirectUrl : null),
						);
					};

					if ($scope.events) {

						$scope.events.on('persist',
							() => {
								
								$scope.events.emit('persist-data', {
									
									id: 'policy',
									type: 'policy',
									value: {
										action: $scope.policy.split(' ')[0],
										url: $scope.policy == 'redirect' ? $scope.redirectUrl : null
									}
									
								});
								
							});
						
					}
				}, 
			}
		})
	
	.directive('ruleValue',
		() => {
			
			return {
				
				restrict: 'E',
				
				scope: {
					value: "=",
					type: "=",
					events: '=',
					idval: "="
						   
				},
				
				template: '<bdi contenteditable="true" placeholder="Enter value ... " ng-bind="value"></bdi>',
				
				link: function($scope, element, attr) {
					
					element.css({
						
						"min-width": "100%",
						"width": "100% !important",
						"height": "5px !important",
						"min-height": "5px !important",
						"padding-left": "10px",
						"text-overflow": "ellipsis",
						"overflow": "hidden",
						"outline": "none !important",
						"display": "inline-block"
					});
					
					element.on('input', function(ev) {
						
						if ($scope.tID)
							clearTimeout($scope.tID);
						
						$scope.tID = setTimeout(
							ev => {
								
								$scope.value = element.text().trim();
								
							}, 1200, ev
						);
					});
					
					element.keypress(ev => { return ev.which != 13; });
						   
					$scope.events.on('persist', () => {
						
						$scope.events.emit('persist-data', {
							id: $scope.idval,
							value: $scope.value,
								   type: $scope.type
						});
					})
				}
			}
		})
	
	.directive('headerName',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
						   name: '=',
						   idire: '=',
						   events: '='
					   },

					   template: '<array-validator style="display: inline-block; width: 90%;" text="name" valids="array" idire="idire" type="\'header\'" events="events"></array-validator><span style="display: inline-block;">: </span>',
					   
					   controller: function ($scope) {
						   
						   $scope.array = [
							   
							   "Accept",
							   "Accept-Charset",
							   "Accept-Datetime",
							   "Accept-Encoding",
							   "Accept-Language",
							   "Access-Control-Request-Method",
							   "Access-Control-Request-Headers",
							   "Authorization",
							   "Cache-Control",
							   "Connection",
							   "Cookie",
							   "Content-Length",
							   "Content-MD5",
							   "Content-Type",
							   "Date",
							   "Expect",
							   "Forwarded",
							   "From",
							   "Host",
							   "If-Match",
							   "If-Modified-Since",
							   "If-None-Match",
							   "If-Range",
							   "If-Unmodified-Since",
							   "Max-Forwards",
							   "Origin",
							   "Pragma",
							   "Proxy-Authorization",
							   "Range",
							   "Referer",
							   "TE",
							   "User-Agent",
							   "Upgrade",
							   "Via",
							   "Warning",

							   /* Non standard */
							   
							   "X-Requested-With",
							   "DNT",
							   "X-Forwarded-For",
							   "X-Forwarded-Host",
							   "X-Forwarded-Proto",
							   "Front-End-Https",
							   "X-Http-Method-Override",
							   "X-ATT-DeviceId",
							   "X-Wap-Profile",
							   "Proxy-Connection",
							   "X-UIDH",
							   "X-Csrf-Token",
							   "X-Request-ID",
							   "X-Correlation-ID"
						   ];
						   
					   }
				   }
			   })

	.directive('attrKey',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
						   name: '=',
						   idire: '=',
						   events: '='
					   },
					   
					   template: '<array-validator style="display: inline-block;" text="name" valids="array" idire="idire" type="\'attr\'" events="events"></array-validator>',
					   
					   controller: function ($scope) {
						   
						   $scope.array = [
							   
							   "frameId",
							   "parentFrameId",
							   "method",
							   "type",
							   "url",
							   "originUrl",
							   "documentUrl"   
						   ]; 
					   }
				   }
			   })

	.directive('arrayValidator',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
						   text: '=',
						   valids: '=',
						   idire: '=',
						   type: '=',
						   events: '='
					   },

					   transclude: false,
					   
					   template: '<angucomplete-alt' +
						   ' id="idire"' +
						   ' placeholder="Enter name ..."' +
						   ' local-data="data"' +
						   ' minlength="1"' +
						   ' pause="50"' +
						   ' title-field="data"' +
						   ' search-field="data"' +
						   ' local-search="typing"' +
						   ' selected-object="selected"' +
						   ' input-class="autocomplete-inpt"' +
						   ' auto-match="true"' +
						   ' input-changed="changed"' + 
						   ' initial-value="text"' +
						   ' focus-out="focusOut()"' +  
						   '></angucomplete-alt>',
					   
					   link: function ($scope, element, attr) {

						   $scope.el = element;  
					   },
 
					   controller: function ($scope, $timeout) {
						   
						   $scope.actual = $scope.text;
						   $scope.rejected = [];
						   
						   $scope.data = $scope.valids.map(
							   item => {
								   return {data: item};
							   }
						   );
						   
						   $scope.__diff = function (big, small) {
							   
							   return big.map(
								   item => {

									   return small.findIndex(
										   sitem => {
											   
											   return sitem.data == item.data;
											   
										   }) >= 0 ? false : item;  
								   }
								   
							   ).filter(elem => { return elem; });
							   
						   };

						   $scope.__appendRejected = function (name) {

							   let exists = $scope.rejected.findIndex(
										   
								   item => {
									   
									   return item.data == name;
								   }
							   );
							   
							   if (exists < 0)
								   $scope.rejected.push({data: name});
						   }
						   
						   $scope.focusOut = function () {
							   
							   if ($scope.input.val() != $scope.actual) {

								   $scope.input.val($scope.actual);
								   $scope.input.trigger('input');
							   }
						   };

						   $scope.selected = function (selection) {
							   
							   if (selection) {

								   if (selection.title != $scope.actual) {
									   
									   $scope.events.emit('neighbour_update_' + $scope.type,
									   					  $scope.idire,
														  $scope.actual,
														  selection.title 
									   					 );
									   
									   $scope.actual = selection.title;
								   }
							   }  
						   };

						   $scope.typing = function (query, array) {
							   
							   return $scope.__diff(array, $scope.rejected).filter(
								   item => {
									   return item.data.match(new RegExp('^' + query, 'i'));
								   }
							   ); 
					   	   };
 
						   $scope.events
							   .on('ack_' + $scope.idire,
								   neighbour => {

									   $scope.__appendRejected(neighbour);
									   
								   })
						   
							   .on('new_neighbour_' + $scope.type,
								   (sender, name) => {
									   
									   if (sender != $scope.idire) {
										   
										   if (name.length) 
											   $scope.__appendRejected(name);
										   
										   $scope.events.emit('ack_' + sender, $scope.actual);
									   }
									   
								   })
						   
							   .on('neighbour_update_' + $scope.type,
								   (sender, oldVal, newVal) => {
									   
									   if (sender != $scope.idire) {
										   
										   let to_update = $scope.rejected.findIndex(
											   
											   item => {
												   
												   return item.data == oldVal;
											   }
										   );
										   
										   if (to_update >= 0)
											   $scope.rejected[to_update].data = newVal;
										   else 
											   $scope.rejected.push({data: newVal}); /* New values */
									   }
								   })
						   
							   .on('neighbour_remove_' + $scope.type,
								   idx => {
									   
									   if ($scope.idire.split("_")[0] == idx) {
										   
										   $scope.events.emit('neighbour_delete_' + $scope.type, $scope.idire, $scope.actual);
										   $scope.events.emit('key_remove', idx, $scope.type);
										   $scope.$destroy();
									   }
								   })
						   
							   .on('neighbour_delete_' + $scope.type,
								   (sender, name) => {
									   
									   if ($scope.idire != sender) {
										   
										   $scope.rejected.remove(
											   $scope.rejected.findIndex(
												   item => { return item.data == name; }
											   )
										   );
									   }
								   })

							   .on('persist', () => {
							   
								   $scope.events.emit('persist-data', {
									   id: $scope.idire,
									   value: $scope.actual,
									   type: $scope.type
								   });
							   });
						   
						   $timeout(
							   () => {
								   
								   $scope.input = $scope.el.find('input'); 
								   $scope.events.emit('new_neighbour_' + $scope.type, $scope.idire, $scope.text);
							   }
						   );
					   }
				   }
			   })

	.directive('aRule',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   transclude: true,
					   
					   scope: {
						   
						   rule: '=',
						   state: '='
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/a-rule.html");
					   },
					   
					   controller: function ($scope) {
						   
						   $scope.status = {}
						   $scope.id = UUID.generate().split('-').pop();
						   $scope.headers_shown = false;
						   $scope.criteria_shown = false;
						   $scope.rule_shown = false;
						   $scope.events = new EventEmitter();
						   $scope.elems = $scope.rule.headers.length + $scope.rule.criteria.lenght + 1;
						   
						   $scope.statusRule = function () {
							   
							   return $scope.rule_shown ? "v" : ">";
						   };
						   
						   $scope.toggleRule = function () {
							   
							   $scope.rule_shown = !$scope.rule_shown;
						   };
						   
						   $scope.statusHeaders = function () {
							   
							   return $scope.headers_shown ? "v" : ">";
						   };
						   
						   $scope.toggleHeaders = function () {
							   
							   $scope.headers_shown = !$scope.headers_shown;
						   };
						   
						   $scope.statusCriteria = function (rule) {
							   
							   return $scope.criteria_shown ? "v" : ">";
						   };
						   
						   $scope.toggleCriteria = function (rule) {
							   
							   $scope.criteria_shown = !$scope.criteria_shown;
						   };
						   
						   $scope.addHeader = function (rule) {
							   
							   $scope.rule.headers.push({ name: " ", value: "" });
							   
						   };
						   
						   $scope.addCritAttr = function (rule) {
							   
							   $scope.rule.criteria.factory({ key: " ", value: "", comp: "=" });
						   };
						   
						   $scope.buildIdFor = function (idx, type) {
							   
							   return new String (idx + '_' + type).toString();
						   };
						   
						   $scope.removeHeader = function (idx) {
							   
							   $scope.events.emit('neighbour_remove_header', idx);
							   
						   };
						   
						   $scope.removeAttr = function (idx) {
							   
							   $scope.events.emit('neighbour_remove_attr', idx);
							   
						   };
						   
						   $scope.removeRule = function () {
							   
							   $scope.rule.mgr.removeRule($scope.rule.id);
							   
							   $scope.state.transitionTo($scope.state.current, {"#": "rules"}, { 
								   reload: true, inherit: false, notify: false 
							   });
						   };
						   
						   $scope.events
							   .on('key_remove',
								   (idx, type) => {
									   
									   switch(type) {
										   
										   case "header":
											   $scope.rule.headers.remove(idx);
											   break;
											   
										   case "attr":
											   $scope.rule.criteria.remove(idx);
											   break;
											   
										   default:
											   break;
									   }
								   })
							   .on('persist-data', data => {
								   
							   	   $scope.elems --;
								   
							   	   // console.log('persist-data: ');
							   	   // console.log(data);
								   
							   	   let idx = data.id.split('_')[0];
							   	   let type = data.id.split('_').pop();
								   
							   	   switch(data.type) {
									   
							   		   case "header":
										   
										   if ($scope.rule.headers[idx]) {
											   
							   				   if (type == 'key') 
							   					   $scope.rule.headers[idx].name = data.value;
							   				   else if (type == 'value')
							   					   $scope.rule.headers[idx].value = data.value;
											   
										   }
										   
							   			   break;
										   
							   		   case "attr":
										   
										   if ($scope.rule.criteria.attributes[idx]) {
											   
							   				   if (type == 'key') 
							   					   $scope.rule.criteria.attributes[idx].key = data.value;
							   				   else if (type == 'value')
							   					   $scope.rule.criteria.attributes[idx].value = data.value;
										   }
										   
							   			   break;
										   
							   		   case"policy":
										   
							   			   rule.policy.action = data.value.action;
							   			   rule.policy.data = data.value.url;
										   
							   			   break;
										   
							   		   default:
							   			   break;
							   	   }
								   
								   
							   	   if (!$scope.elems) {
									   
							   		   $scope.elems = $scope.rule.headers.length + $scope.rule.criteria.lenght + 1;
							   		   $scope.rule.mgr.persist();
									   
							   	   }
							   });
					   }
				   }
			   })

	.directive('aProxyRule',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   transclude: true,
					   
					   scope: {
						   
						   rule: '=',
						   pnames: '=',
						   mgr: '=',
						   state: '='
						   
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/a-proxy-rule.html");
					   },

					   controller: function ($scope) {
						   
						   $scope.disabled = false;
						   
						   $scope.events = new EventEmitter();
						   
						   $scope.currentProxy = $scope.rule.proxy;
						   
						   $scope.removeProxyRule = function () {

							   $scope.mgr.upsertProxy($scope.rule.host, "None");

							   $scope.state.transitionTo($scope.state.current, {"#": "proxy"}, { 
								   reload: true, inherit: false, notify: false 
							   });
						   };

						   $scope.persistProxyRule = function () {
							   
							   $scope.mgr.upsertProxy($scope.rule.host, $scope.currentProxy);	   
						   };

						   $scope.events
							   .on('validation_start',
								  unvalidated => {

									  $scope.disabled = true;
									  $scope.$digest();
									  
								  })
						   
							   .on('validation_ready',
								   validated => {

									   $scope.host = validated;
									   $scope.disabled = false;
									   $scope.$digest();
									   
								   });
						   
					   }
				   }
			   })

	.directive('hostValidator',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
 						   host: "=",
						   events: "="
						   
					   },
					   
					   template: '<bdi contenteditable="true" placeholder="Enter host name ... ">{{host}}</bdi>',
					   
					   link: function($scope, element) {
						   
						   element.on('input', $scope.validateHost);
						   
						   element.keypress(ev => { return ev.which != 13; });
						   element.click(ev => { return false; });
						   
						   /* !!! Ctrl-C - Ctrl-V */
					   },
					   
					   controller: function ($scope) {

						   $scope.backup = $scope.host;
						   
						   $scope.validateHost = function (ev) {
							   
							   $scope.host = $(ev.target).text().trim();
							   
							   if ($scope.events)
								   $scope.events.emit("validation_start", $scope.host);
							   
							   if($scope.changeID)
								   clearTimeout($scope.changeID);
							   
							   $scope.changeID = setTimeout(
								   ev => {
									   
									   try {
										   
										   var temp = new URL("http://" + $scope.host);

										   $scope.backup = temp.hostname;
										   
									   } catch (e) {

										   if (e instanceof TypeError) {

											   if ($scope.host != '*' && !$scope.host.startsWith("*.")) 
												   $scope.host = $scope.backup;
											   else 
												   $scope.backup = $scope.host;
										   }
									   }
									   
									   $(ev.target).text($scope.host);
									   
									   if ($scope.events)
										   $scope.events.emit("validation_ready", $scope.host);
									   
									   $scope.$digest();
									   
								   }, 800, ev);
						   };
						   
					   }
				   }
			   })

	.directive('scriptList',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   transclude: true,
					   
					   scope: {
						   
						   list: "=list",
						   parent: "=?parent",
						   port: "=port",
						   editor: "=editor",
						   shown: "=shown",
						   opts: "=opts"
						   
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/script-list.html");
					   },
					   
					   controller: function ($scope, $timeout) {

						   if (!$scope.parent)
							   $scope.parent = $scope.list[0].parent;
						   
						   $scope.list_uuid = UUID.generate();
						   //$scope.name = $scope.parent.isGroup() ? $scope.parent.name : $scope.parent.parent.name;
						   $scope.name = $scope.parent.url || ( ( $scope.parent.name.slice(-1) == "/" && $scope.parent.name.length ) > 1 ? $scope.parent.name.slice(0, -1) : $scope.parent.name );
						   
						   $scope.addScript = function() {
							   
							   $scope.editor($scope.parent.factory());
							   
						   };
						   
						   if ($scope.port) {
							   
							   $scope.port.onMessage.addListener(
								   args => {
									   
									   switch (args.action) {
									   case "list-update":
										   
										   if ($scope.name == args.message) {
											   
											   //console.log("List update for: " + $scope.parent.parent.name + $scope.parent.url);
											   
											   if (!$scope.list.length)
										   		   $scope.$destroy();
											   else {
												   
										   		   for(script of $scope.list)   
													   script.insertElem($scope.list_uuid, $scope.shown);
												   
										   		   $scope.$digest();

												   $('#' + $scope.list_uuid).find('code').each(
													   (i, block) => {
														   $(block).css("font-size", $scope.opts.fontSize + "pt");
													   }
												   );
											   }
										   }
										   
										   break;
									   }
								   }
							   )
						   }
					   }   
				   }
			   })

	.directive('groupValidator',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
 						   group: "=group",
						   ev: "=ev"
						   
					   },

					   transclude: true,

					   template: '<bdi style="display: inline-flex; flex-shrink: 0;" contenteditable="true"> {{group}} </bdi>',
					   
					   link: function($scope, element) {
					   
						   
						   element.on('input', $scope.validateGroup);
						   
						   element.keypress(ev => { return ev.which != 13; });
						   element.click(ev => { return false; });
						   
						   /* !!! Ctrl-C - Ctrl-V */
					   },

					   controller: function ($scope) {

						   $scope.backup = $scope.group;
						   
						   $scope.validateGroup = function (ev) {
	   
							   $scope.group = $(ev.target).text().trim();
							   
							   if ($scope.ev)
								   $scope.ev.emitEvent("validation_start", [$scope.group]);
							   
							   if($scope.changeID)
								   clearTimeout($scope.changeID);
							   
							   $scope.changeID = setTimeout(
								   ev => {
									   
									   if ($scope.group.match(/^[a-z0-9]+$/i))
										   $scope.backup = $scope.group;
									   else
										   $scope.group = $scope.backup;
									   
									   $(ev.target).text($scope.group);

									   if ($scope.ev)
										   $scope.ev.emitEvent("validation_ready", [$scope.group]);
									   
									   $scope.$digest();
									   
								   }, 800, ev);
						   }
					   }
				   }
			   })

	.directive('siteValidator',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
 						   url: "=url",
						   ev: "=ev"
						   
					   },

					   transclude: true,

					   template: '<bdi style="display: inline-flex; flex-shrink: 0;" contenteditable="true"> {{url}} </bdi>',
					   
					   link: function($scope, element) {
					   
						   // element.css({
						   // 	   "min-width": ((window.innerWidth/2) - 30) + "px"
						   // });
						   
						   element.on('input', $scope.validateSite);
						   
						   element.keypress(ev => { return ev.which != 13; });
						   element.click(ev => { return false; });
						   
						   /* !!! Ctrl-C - Ctrl-V */
					   },
					   
					   controller: function ($scope) {

						   try {

							   $scope.backup = new URL('http://' + $scope.url).sort();

						   } catch (e) {

							   $scope.backup = $scope.url;
						   }
						   
						   $scope.isSubDomain = function (orig, modified) {
							   
							   if (orig.endsWith("/"))
								   orig = orig.slice(0, -1);
							   
							   if (modified.endsWith("/"))
								   modified = modified.slice(0, -1);
							   
							   var mod_arr = modified.split(".");
							   var orig_arr = orig.split(".");
							   
							   var cursor_mod = mod_arr.length - 1;
							   var cursor_orig = orig_arr.length - 1;
							   
							   while ( (mod_arr[cursor_mod] != "*") &&
									   (mod_arr[cursor_mod] == orig_arr[cursor_orig])
									 ) {
								   
								   cursor_mod --;
								   cursor_orig --;	
							   }
							   
							   return mod_arr[cursor_mod] == "*";
						   };

						   $scope.isSubSet = function (orig, modified) {
							   
							   if (orig.endsWith("/"))
								   orig = orig.slice(0, -1);

							   if (modified.endsWith("/"))
								   modified = modified.slice(0, -1);
							   
							   var mod_arr = modified.split(".");
							   var orig_arr = orig.split(".");
							   
							   var cursor_mod = mod_arr.length - 1;
							   var cursor_orig = orig_arr.length - 1;
							   
							   while ((mod_arr[cursor_mod] == orig_arr[cursor_orig])) {

								   cursor_mod --;
								   cursor_orig --;	
							   }
							   
							   return mod_arr[cursor_mod] == "*" || orig_arr[cursor_orig] == "*";
						   };
						   
						   $scope.validateSite = function (ev) {
							   
							   $scope.url = $(ev.target).text().trim();
							   
							   if ($scope.ev)
								   $scope.ev.emitEvent("validation_start", [$scope.url]);
							   
							   if($scope.changeID)
								   clearTimeout($scope.changeID);
							   
							   $scope.changeID = setTimeout(
								   ev => {
									   
									   try {
										   
										   var temp = new URL("http://" + $scope.url);

										   try {
											   
											   if (temp.hostname != $scope.backup.hostname)
												   $scope.url = $scope.backup.name();	
											   else
												   $scope.backup = temp;

										   } catch (err) {
											   
											   /* String backup */
											   
											   if ($scope.isSubDomain(temp.hostname, $scope.backup))
												   $scope.backup = temp; 
											   else
												   $scope.url = $scope.backup;
											   
										   }
										   
									   } catch (e) {

										   if (e instanceof TypeError) {
											   
											   if (!$scope.url.startsWith("*.")) 
												   $scope.url = $scope.backup.name();
											   else {
												   
												   if ($scope.isSubDomain($scope.backup.hostname || $scope.backup, $scope.url.split("/")[0])) {
													   
													   $scope.url = $scope.url.split("/")[0]; /* "All subdomains" shortcut ... */
													   $scope.backup = $scope.url;
													   
												   } else {
													   
													   if ($scope.isSubSet($scope.backup.hostname || $scope.backup, $scope.url.split("/")[0])) 
														   $scope.backup = $scope.url;
													   else 
														   $scope.url = typeof($scope.backup) == "string" ? $scope.backup : $scope.backup.name();
												   }
											   }
										   }
									   }	  

									   if ($scope.url.slice(-1) == "/")
										   $scope.url = $scope.url.slice(0, -1);
										   
									   $(ev.target).text($scope.url);

									   if ($scope.ev)
										   $scope.ev.emitEvent("validation_ready", [$scope.url]);
									   
									   $scope.$digest();
									   
								   }, 800, ev);
						   };
						   
					   }
				   }
			   })

	.directive('siteIndex',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   transclude: true,
					   
					   scope: {
						   
						   list: "=list",
						   parent: "=parent",
						   mgr: "=mgr"
						   
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/site-index.html");
					   },
					   
					   controller: function ($scope) {

						   $scope.shown = true;
						   $scope.state = ">";
						   
						   $scope.toggleList = function () {
							   
							   $scope.shown = !$scope.shown;
							   $scope.state = $scope.state == ">" ? "v" : ">";
						   };
						   
						   $scope.removeSite = function (sname) {
							   
							   $scope.mgr.removeSiteFrom($scope.parent.name, sname);
							   
						   };
						   
					   }
				   }
			   })

	.directive('groupList',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
						   scripts: "=scripts",
						   parent: "=parent",
						   port: "=port",
						   editor: "=editor",
						   shown: "=shown",
						   opts: "=opts",
						   sites: "=sites",
						   mgr: "=mgr"
						   
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/group-list.html");
					   },
				   }
			   })

	.directive('aceInline',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
						   feeding: "=feeding",
						   height: "=h",
						   width: "=w"
						   
					   },
					   
					   templateUrl: function (elem, attr) {

						   return browser.extension.getURL("fg/partials/ace-frame.html");

					   },
					   
					   controller: function ($scope) {
						   
						   $scope.src = browser.extension.getURL("fg/partials/ace-inline.html") + "?feeding=" + $scope.feeding;

					   }
					   
				   }
			   })

	.directive('optionMenu',
			   () => {
				   
				   return {
					   
					   restrict: 'E',
					   
					   scope: {
						   
						   list: "=list",
						   key: "=key",
						   title: '=title',
						   port: "=port"
					   },
					   
					   templateUrl: function (elem, attr) {
						   return browser.extension.getURL("fg/partials/option-menu.html");
					   },
					   
					   controller: function ($scope) {

						   if ($scope.port) {
							   
							   $scope.port.onMessage.addListener(

								   (args) => {
								   
									   switch (args.action) {
									   
									   case "import-opts":
										   
										   for (opt of $scope.list) {
											   
											   opt.setVal(args.message[$scope.key][opt.id]);
											   
											   for (subopt of opt.sub_opts) 
												   subopt.setVal(args.message[$scope.key][subopt.id]); 
										   }
										   
										   $scope.$digest();
									   
										   break;
									   }
								   }
							   )
						   }
					   }
				   }
			   });
