"use strict"

var active = false;
var sites = [ "streamcloud.eu" ];
var currTab;

var ignoreChange = false;

var literal = '(function parse_content () {' +
	'$(".info_notice").hide();' +
	'$("div").each(function() {' +

		'if( $(this).attr("name") == "page")' +
          '$(this).css("display", "block");' +

	'});' +
'}());'

function onError(error) {
	console.error(error);
}

function update (tabId, changeInfo, tabInfo) {

		for (var i = 0; i < sites.length; i++) {
			
			if ( tabInfo.url.indexOf(sites[i]) >= 0) {

				/* browser.tabs.on('ready', function(tab) {
				   
				   console.error("The Tab is ready!");
				   console.log(tab);
				   
				   }); */
				
				console.log(Object.keys(literal));

				window.setTimeout(function() {
					browser.tabs.sendMessage(
						
						tabId,
						{func: literal}
						
					).then(response => {
						console.log("Hitted target site ---> " + tabInfo.url);
						console.log("Message from the content script: " + response.response);
					}).catch(onError);
					
				}, 500);
			}
		}
			
	//console.log(tabInfo);
}

function change (actInfo) {

	if (!ignoreChange) {

		currTab = actInfo.tabId || actInfo[0].id;
		console.log("CurrentTab: " + currTab);

	} else {

		ignoreChange = false;

	}

	//browser.pageAction.show(currTab);
}

function runInTab (literal, tabId) {

	console.log("Test tab: " + currTab);
	
	browser.tabs.sendMessage(
				
		currTab,
		{func: literal}
		
	).then(function(obj) {
		
		browser.runtime.sendMessage({
			message: obj.err ? obj.err : obj.response,
			err: obj.err ? true : false
		});
		
	}).catch(onError);

}

/* function getTabNfo (tabInfo) {

   currTab = tabInfo[0].id;
   console.log("CurrentTab: " + currTab);
   //browser.pageAction.show(currTab);
   } */

function showEditor (action) {

	ignoreChange = true;
	console.log("Tab before editor: " + currTab);
	
	var createData = {
		type: "popup",
		url: browser.extension.getURL("editor/editor.html?" + action),
		width: 800,
		height: 600
	};

	var creating = browser.windows.create(createData);
}

function getCurrTab () {

	return browser.tabs.get(currTab); 

}

/* function change_state () {
   
   active = !active;
   
   if (active)
   browser.tabs.onUpdated.addListener(update);
   else 
   browser.tabs.onUpdated.removeListener(update);
   
   }; */

browser.tabs.onUpdated.addListener(update);
browser.tabs.onActivated.addListener(change);

var gettingCurrent = browser.tabs.query({currentWindow: true, active: true});
gettingCurrent.then(change, onError); 

//browser.browserAction.onClicked.addListener(change_state);
