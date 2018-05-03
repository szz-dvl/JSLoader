- In-progress:
  - Big one:
  		* Strong PA, Compressed opt page. [ Allow user to remove group scripts from any of its included sites PA?? ] ====> Opt page refactor!
  		* Bind rules to domains, show them in PA ¿¿??
		* Completely remove logs feature !!.
  		
- Big fails:
  - Something is registering rules!
  - Cascade removes fails at some point.
  - Opened windows after browser crash ==> to be recovered.
  - Feature to duplicate scripts may be worthy (in jupiter) .. ¬¬'.
  - startsWith =====> "/" !!!
  - PA ====> show matching site when group includes scripts??
  
- Unavailable?
  - Use console editor (devtools/sourceeditor/editor) in foreground pages ? 
  - Opening page action from shortcut command fails with: "pageAction.openPopup may only be called from a user input handler"
  
- To be tested:
  - Rules service from conetent script.
  - Rules gral.
  - Import/Export features.
  - Data origin ====> support for MongoDB only.
  - Group OwnerOf =====> Redesigned matching pattern.
  - DB Managing ===> Unitary inserts / updates.
  - Import Button / Disable Everywhere button text. .... ¬¬'
  - Existing tabs are recreated when opening URLs from listener.
  - POSTS request do not show data on tab listener. ====> Rules preference when several policies are applied in one rule or several rules match against a req. 
  - Tab binded new windows found themselfs as current tab ===> to be tested, several browser windows may fail.
  - Logs not registered when errored scripts are opened, notifications won't show. ===> Moved to BlueBird Promises in content script side.
  - Facility to detect if scripts properly run ====> ¿ API to load script from script on demand ? [ ¡¡ Alert: images won't load properly at page action !! ]
  - Modified connection strings are not persisted ===> Strange behavior sometimes.
  
- Finally:
  - Style everything up!
  		  * Inform user of unpersisted data on views.
		  * (( paginate lists, filter for domains & groups lists )).
		  * Listener clip tab button outline won't disapear.
		  * etc, etc, etc ...
		  
  - Initial examples for each info recipient.
  - Prevent context menu on extension windows ??? 
  - Big refactor, Shortcuts + Page Action + Opt Page ===> Definitively remove browser action!
 
  - Must dead scripts be garbage collected?? =S... (Option to run several scripts in one URL in standalone mode, without sharing namespace)

- Caveats:
  - Allow web pages to load scripts of their own for its possible neighbours? [ Only while the script owner is running ]
  		  * Permissions controlled by user ==> how?
		  * Limit third party domains for each site ==> how?
		  * Possible conflicts between scripts ?? ... =S ...
