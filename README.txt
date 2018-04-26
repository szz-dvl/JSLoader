- In-progress:
  - Logs not registered when scripts are opened, notifications won't show.
  
- Big fails:
  - Something is registering rules!
  - Cascade removes fails at some point.
  - Opened windows after browser crash ==> to be recovered.
  - Facility to detect if scripts properly run ====> API to load script from script on demand?
  - Feature to duplicate scripts may be worthy.
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
  - Existing tabs are recreated when opening URLs from listener ===> to be tested when editing existing script.
  - POSTS request do not show data on tab listener. ====> Rules preference when several policies are applied in one rule or several rules match against a req. 
  
- Finally:
  - Style everything up!
  		  * Inform user of unpersisted data on views.
		  * paginate lists, filter for domains & groups lists.
		  
  - Initial examples for each info recipient.
  - Prevent context menu on extension windows.
  - Big refactor, Shortcuts + Page Action + Opt Page ===> Definitively remove browser action!
  
  - Must dead scripts be garbage collected?? =S... (Option to run several scripts in one URL in standalone mode, without sharing namespace)
