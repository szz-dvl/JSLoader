- In-progress:
	- Editor: add download button (download code as text);
  	- Sync opt page editor settings with editor menu.
	- PA: Re-arrange lists.
	- Groups won't be removed from its associated domains on group removal.
	
- Big fails:
  - PA: Scripts toggle btn fails first time after being hidden by parent ...
  - Ace errors not being shown on gutter line, detected by editor however. (disable CSP in about:config solves it, select arrows too! ¿Issue?)
  - Opened windows after browser crash ==> to be recovered.
  - Extensions seems to be sharing storage key names!!

-To Do:
	- Virtual Resources: Missing DB management.
	- script.remove(...) is undefined (pa.js:205);
	
- To be tested:
  - Import/Export features. **
  - Data origin ====> support for MongoDB only. **
  - DB Managing ===> Unitary inserts / updates. ** (¿ Modify db connector replace_one ==> update_one ?)
  - Group OwnerOf =====> Redesigned matching pattern. *
  - Tab binded new windows found themselfs as current tab ===> to be tested, several browser windows may fail.
  - Proxys ===> test new PAC completely.
  - Editor ===> minor testing.
  - startsWith =====> "/" !!!
  - Cascade removes ====> Array.remove [ destructive - index lost - ] collide when multiple items for same parent are quickly removed. (¿ __Script_Bucket ===> to Sets ?);
  - Virt Resources ==> what is done. (Virt FS, Content API[v1] ==> load resource directory);
  - Group creation:
  	* bugs in PA: scripts not shown after first close (Probably from Array.reduce)	

  - Added support for pages that load contents via XHR requests: To be tested ===> when pages updates tab info several times after changing its URL
  		  		  	  			 	  		   	   	   			 (faster solution implemented: the first change will run the associated scripts, enough for any page?
																 		 ===> otherwise debounce deferred execute until last change)

															   * Hypothetical: Active/Unactive tab loading content via XHR without changing tab params (detectable?? ==> request filter.)
															   
- Caveats: /* !!! */
  - Allow web pages to load scripts of their own for its possible neighbours? [ Only while the script owner is running ¿? ]
  		  * Permissions controlled by user ==> how?
		  * Limit third party domains for each site ==> how?
		  * Possible conflicts between scripts ?? ... =S ...

  - Editor Buttons to top bar?
  - Add binded site to group in group creation?
  - Prevent context menu on extension windows ???
  - Use classes in data_model && mgrs.
  
- Issues:
  - Computed "src" attributes won't display in extension pages (when evaluated [eval & friends allowed in CSP])
  - Blank windows. Resize needed to render. (Or right click on the wdw ...)
  - Opening page action from shortcut command fails with: "pageAction.openPopup may only be called from a user input handler"
  - Downloaded files will allways be named "download".
  - browser.pageAction.onClicked ==> dosn't seems to work.
  
- Finally:
  - Style everything up!
  		  * Inform user of unpersisted data on views.
		  * (( paginate lists, filter for domains & groups lists )).
		  * Drop Down Buttons outline
		  * Input + label (come & go ... =S)
		  * etc, etc, etc ...
		  
  - Initial examples for each info recipient.
