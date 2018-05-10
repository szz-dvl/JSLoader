- In-progress:
  - PA preserve view state between data reloads (stateParams).
  - Virtual Resources.
  - Extensions seems to be sharing storage key names!!
  - Extend subdomain functionalities (*: before & after)
  - Ace errors not being shown on gutter line, detected by editor however.
  - Scripts will run even when shown tab is not included in the script matching set if triggered from shortcut.
  
- Big fails:
  - Cascade removes fails at some point.
  - Opened windows after browser crash ==> to be recovered.
  - PA ====> show matching site when group includes scripts??
    
- To be tested:
  - Import/Export features. **
  - Data origin ====> support for MongoDB only. **
  - DB Managing ===> Unitary inserts / updates. ** (Modify db connector replace_one ==> update_one.)
  - Group OwnerOf =====> Redesigned matching pattern. *
  - Tab binded new windows found themselfs as current tab ===> to be tested, several browser windows may fail.
  - Facility to detect if scripts properly run ====> ¿ API to load script from script on demand ?
  - Proxys ===> test new PAC completely.
  - Editor ===> minor testing, style floatting buttons (z-index above editor??).
  - startsWith =====> "/" !!!
	
- Caveats: /* !!! */
  - Allow web pages to load scripts of their own for its possible neighbours? [ Only while the script owner is running ¿?]
  		  * Permissions controlled by user ==> how?
		  * Limit third party domains for each site ==> how?
		  * Possible conflicts between scripts ?? ... =S ...

  - Virtual resources: Allow user to store resources to be used from scripts.
  		  * createObjectURL + web_accessible_resources
- Issues:
  - Computed "src" attributes won't display in extension pages (Any workarround)
  - Blank windows. Resize needed to render.
  - Opening page action from shortcut command fails with: "pageAction.openPopup may only be called from a user input handler"
  
- Finally:
  - Style everything up!
  		  * Inform user of unpersisted data on views.
		  * (( paginate lists, filter for domains & groups lists )).
		  * Buttons out line
		  * Input + label (come & go ... =S)
		  * etc, etc, etc ...
		  
  - Initial examples for each info recipient.
  - Prevent context menu on extension windows ??? 
  - Big refactor, Shortcuts + Page Action + Opt Page ===> Definitively remove browser action!
