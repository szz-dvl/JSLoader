- In-progress:
	- Big Refactor: groups not binded to domains (remove group array in Domain object: expensive queries).
	  	  					PA:
								- Bug when removing site
								- Site included by parent: recover isMySite
								
- Big fails:
  - PA: Scripts toggle btn fails first time after being hidden by parent ...
  - Ace errors not being shown on gutter line, detected by editor however. (disable CSP in about:config solves it, select arrows too! ¿Issue?)
  - Opened windows after browser crash ==> to be recovered.
  - Extensions seems to be sharing storage key names!!

- To Do:

	- Editor: Big Refactor { add download button (download code as text); 
  	  		  	  		   - Sync opt page editor settings with editor menu.
						   - Editor tab check for outdated.
						   - "Add site" button by group chooser when adding group scripts
						   - Editor BG to class extending EventEmitter, talk FG via events }
	
	- Init user defs: import Js (remove async && underscore)
	
	- Virtual resources:
	  		  - load them recoursively (resource that claim another resource (some moustache like synthax));
			  - Drag & Drop (move resource ==> renameResource ==> ++ solveHierarchy);
			  - Missing DB management.
	
	- opt page: replace "Go" button ===> url on hover
	  	  		Tooltip for sites showing the particular sites aded for a domain.
				- Paginate Lists:
				  		  - Missing filter for lists in opt page
						  - Missing DB results list.
					
	- Error manager for beta testing.
								
	- -------------> Beta 1 <---------------
	
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
  	* bugs in PA: scripts not shown after first close (Probably from Array.reduce solved BUG)	

  - Added support for pages that load contents via XHR requests: To be tested ===> when pages updates tab info several times after changing its URL
  		  		  	  			 	  		   	   	   			 (faster solution implemented: the first change will run the associated scripts, enough for any page?
																 		 ===> otherwise debounce deferred execute until last change)

															   * Hypothetical:
																	Active/Unactive tab loading content via XHR without changing tab params
																	(detectable?? ==> [request filter, implement watchers for scripts better: user responsability].)
															   
  - PA: Re-arrange lists [DropDown button keep failing when parent sections hides them while opened].
  - Frames not destroyed! ===> getFramesFor instead of getMainFramesFor;
  
- Caveats: /* !!! */
  - Allow web pages to load scripts of their own for its possible neighbours? [ Only while the script owner is running ¿? ]
  		  * Permissions controlled by user ==> how?
		  * Limit third party domains for each site ==> how?
		  * Possible conflicts between scripts ?? ... =S ...

  - Sidebar: JSL components ==> give support for mouse
  
  - Add binded site to group in group creation?
  - Prevent context menu on extension windows ???
  - Use classes in data_model && mgrs. ... _''_ ...
  
- Issues:
  - Computed "src" attributes won't display in extension pages (when evaluated [eval & friends allowed in CSP])
  - Blank windows. Resize needed to render. (Or right click on the wdw ...)
  - Opening page action from shortcut command fails with: "pageAction.openPopup may only be called from a user input handler"
  - Downloaded files will allways be named "download".
  - browser.pageAction.onClicked ==> dosn't seems to work.
  
- Finally:
  - Style everything up!
  		  * Inform user of unpersisted data on views.
		  * (( paginate lists, filter for domains & groups lists )). (IP)
		  * etc, etc, etc ...
		  
  - Initial examples for each info recipient.
  - Translations

_____-- MANUALS --______

Linux users:

	  $> git clone --recurse-submodules https://github.com/szz-dvl/JSLoader.git
	  $> cd JSLoader
	  $> ./build

	  * Allow unsigned apps, etc, etc ... install jsload-unsigned.xpi and enjoy!

Windows users:

		* Either wait for signed version or try to build xpi and native app by yourself.


		Cheers!
