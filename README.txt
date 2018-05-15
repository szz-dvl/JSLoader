- In-progress:
  - Virtual Resources.
  
- Big fails:
  - PA: Scripts toggle btn fails first time after being hidden by parent ...
  - Ace errors not being shown on gutter line, detected by editor however.
  - Opened windows after browser crash ==> to be recovered.
  - Extensions seems to be sharing storage key names!!
	
- To be tested:
  - Import/Export features. **
  - Data origin ====> support for MongoDB only. **
  - DB Managing ===> Unitary inserts / updates. ** (Modify db connector replace_one ==> update_one.)
  - Group OwnerOf =====> Redesigned matching pattern. *
  - Tab binded new windows found themselfs as current tab ===> to be tested, several browser windows may fail.
  - Proxys ===> test new PAC completely.
  - Editor ===> minor testing, style floatting buttons (z-index above editor??).
  - startsWith =====> "/" !!!
  - Cascade removes ====> Array.remove [destructive - index lost -] collide when multiple items for same parent are quickly removed. (¿ __Script_Bucket ===> to Sets ?);
  
- Caveats: /* !!! */
  - Allow web pages to load scripts of their own for its possible neighbours? [ Only while the script owner is running ¿?]
  		  * Permissions controlled by user ==> how?
		  * Limit third party domains for each site ==> how?
		  * Possible conflicts between scripts ?? ... =S ...

  - Virtual resources: Allow user to store resources to be used from scripts.
  		  * createObjectURL + web_accessible_resources

  - Editor Button to top bar?
  
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


 -Olaf va de collons aixó!!! @ santi (szz)
