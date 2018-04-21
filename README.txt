- In-progress:
  - Group OwnerOf fails miserably.
  - Set new icon for page action when there are scripts running ... ¬¬'
	
- Big fails:
  - Something is registering rules!
  - Cascade removes fails at some point.
  - Inform user of unpersisted data on views.
  - Opened windows after browser crash ==> to be recovered.
  
- Unavailable?
  - Use console editor (devtools/sourceeditor/editor) in foreground pages ? 

- To be tested:
  - Rules service from conetent script.
  - Rules gral.
  - Import/Export features.
  - Data origin ====> support for MongoDB only.
	
- Finally:
  - Style everything up! ====> paginate lists.
  - Initial examples for each info recipient.
  - Prevent context menu on extension windows.
  - Existing tabs are recreated when opening URLs from listener.
  - Opening page action from shortcut command fails with: "pageAction.openPopup may only be called from a user input handler"
  - Big refactor, Shortcuts + Page Action + Opt Page ===> Definitively remove browser action!
  
-El raco d'en Santi
  -Varies icones per Page Action ===> Olaf ho he trobat!!! ====> mira: "https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/pageAction/setIcon"
  -Les fonts son petites si estas lluny de la pantalla!!
