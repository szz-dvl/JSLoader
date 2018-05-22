- In-progress:
  - Virtual Resources:	   
		    * Missing view resource
			* Missing DB management
			* Missing Content API.
						
  - Group creation:
  		  * bugs in PA: scripts not shown after first close (after import ¿?)
		  
  - Add small menu in editor to configure settings quickly (bottom right corner).
  
- Big fails:
  - PA: Scripts toggle btn fails first time after being hidden by parent ...
  - Ace errors not being shown on gutter line, detected by editor however. (disable CSP in about:config solves it, select arrows too!)
  - Opened windows after browser crash ==> to be recovered.
  - Extensions seems to be sharing storage key names!!
	
- To be tested:
  - Import/Export features. **
  - Data origin ====> support for MongoDB only. **
  - DB Managing ===> Unitary inserts / updates. ** (¿ Modify db connector replace_one ==> update_one ?)
  - Group OwnerOf =====> Redesigned matching pattern. *
  - Tab binded new windows found themselfs as current tab ===> to be tested, several browser windows may fail.
  - Proxys ===> test new PAC completely.
  - Editor ===> minor testing, style floatting buttons (z-index above editor??).
  - startsWith =====> "/" !!!
  - Cascade removes ====> Array.remove [destructive - index lost -] collide when multiple items for same parent are quickly removed. (¿ __Script_Bucket ===> to Sets ?);
  - Virt Resources filter.
			
- Caveats: /* !!! */
  - Allow web pages to load scripts of their own for its possible neighbours? [ Only while the script owner is running ¿?]
  		  * Permissions controlled by user ==> how?
		  * Limit third party domains for each site ==> how?
		  * Possible conflicts between scripts ?? ... =S ...

  - Editor Buttons to top bar?
  - Add binded site to group in group creation?
  
- Issues:
  - Computed "src" attributes won't display in extension pages (Any workarround)
  - Blank windows. Resize needed to render.
  - Opening page action from shortcut command fails with: "pageAction.openPopup may only be called from a user input handler"
  
- Finally:
  - Style everything up!
  		  * Inform user of unpersisted data on views.
		  * (( paginate lists, filter for domains & groups lists )).
		  * Drop Down Buttons outline
		  * Input + label (come & go ... =S)
		  * etc, etc, etc ...
		  
  - Initial examples for each info recipient.
  - Prevent context menu on extension windows ???
