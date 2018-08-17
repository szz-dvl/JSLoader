function TranslationMgr (bg) {

	this.language = browser.i18n.getUILanguage().split("-")[0];
	
	this.texts = [

		{id: "save", en: "Save", es: "Salvar", ca: "Salvar" },
		{id: "run", en: "Run in Page", es: "Ejecutar", ca: "Executar" },
		{id: "remove", en: "Remove", es: "Eliminar", ca: "Eliminar" },
		{id: "add", en: "Add", es: "Añade", ca: "Afegeix" },
		{id: "resource", en: "Resource", es: "Recurso", ca: "Recurs" },
		{id: "script_for", en: "Script for:", es: "Script para:", ca: "Script per:" },
		{id: "new_group", en: ".New group.", es: ".Nuevo grupo.", ca: ".Nou grup." },
		{id: "add_group", en: "Add group", es: "Crear grupo", ca: "Crear grup" },
		{id: "cancel", en: "Cancel", es: "Cancelar", ca: "Cancelar" },
		{id: "tab_site", en: "tab site", es: "pestaña", ca: "pestanya" },
		{id: "show_gutter", en: "Show gutter line", es: "Mostrar linea de ayuda", ca: "Mostra linea d'ajuda" },
		{id: "margin_col", en: "Margin column", es: "Linea de margen", ca: "Linia de marge" },
		{id: "font_size", en: "Font size", es: "Tamaño de fuente", ca: "Tamany de font" },
		{id: "edit_theme", en: "Editor theme", es: "Tema del editor", ca: "Tema de l'editor" },
		{id: "font_fam", en: "Font family", es: "Familia fuente", ca: "Familia font" },
		{id: "settings_tit", en: "JSL Settings", es: "Configuración JSL", ca: "Configuració JSL" },
		{id: "user_data", en: "User Data", es: "Datos de Usuario", ca: "Dades d'usuari" },
		{id: "connected", en: "Connected", es: "Conectado", ca: "Conectat" },
		{id: "readable", en: "Readable", es: "Lectura", ca: "Lectura" },
		{id: "writeable", en: "Writeable", es: "Escritura", ca: "Escriptura" },
		{id: "data_origin", en: "Data Origin:", es: "Origen de Datos:", ca: "Origen dades:" },
		{id: "storage", en: "Storage", es: "Almacenamiento", ca: "Emagatzematge" },
		{id: "name", en: "Name", es: "Nombre", ca: "Nom" },
		{id: "scripts", en: "Scripts", es: "Scripts", ca: "Scripts" },
		{id: "actions", en: "Actions", es: "Acciones", ca: "Accions" },
		{id: "sites", en: "Sites", es: "Sites", ca: "Sites" },
		{id: "origin", en: "Origin", es: "Origen", ca: "Origen" },
		{id: "domains", en: "Domains", es: "Dominios", ca: "Dominis" },
		{id: "groups", en: "Groups", es: "Grupos", ca: "Grups" },
		{id: "move2db", en: "Move to DB", es: "Mover a BD", ca: "Moure a BD" },
		{id: "import2st", en: "Import to ST", es: "Importar a ST", ca: "Importar a ST" },
		{id: "import_data", en: "Import Data", es: "Importar Datos", ca: "Importar Dades" },
		{id: "export_data", en: "Export Data", es: "Exportar Datos", ca: "Exportar Dades" },
		{id: "clear_data", en: "Clear Data", es: "Eliminar Datos", ca: "Eliminar Dades" },
		{id: "edit_udefs", en: "Edit User Defs", es: "Editar Definiciones", ca: "Editar Definicions" },
		{id: "editor_settings", en: "Editor settings", es: "Configuraciones editor", ca: "Configuracions d'editor" },
		{id: "virt_res", en: "Virtual resources", es: "Recursos virtuales", ca: "Recursos virtuals" },
		{id: "edit_res", en: "Edit Resource", es: "Editar Recurso", ca: "Editar Recurs" },
		{id: "import_res", en: 'Import Resource', es: "Importar Recurso", ca: "Importar Recurs" },
		{id: "edit_src", en: 'Edit Source', es: "Editar Codigo", ca: "Editar Codi" },
		{id: "dir", en: 'directory', es: "directorio", ca: "directori" },
		{id: "file", en: 'file', es: "fichero", ca: "fitxer" },
		{id: "at", en: 'at', es: "en", ca: "a" },
		{id: "enable", en: 'Enable', es: "Activa", ca: "Activa" },
		{id: "disable", en: 'Disable', es: "Desactiva", ca: "Desactiva" },
		{id: "edit", en: 'Edit', es: "Editar", ca: "Editar" },
		{id: "reload", en: 'Reload', es: "Recargar", ca: "Carrega" },
		{id: "add_script", en: 'Add Script', es: "Nuevo Script", ca: "Nou Script" },
		{id: "add_group_script", en: 'Add Group Script', es: "Nuevo Script Grupo", ca: "Nou Script Grup" },
		{id: "included_scripts", en: 'Included Scripts', es: "Scripts incluidos", ca: "Scripts inclosos" },
		{id: "sure", en: 'Sure?', es: "Seguro?", ca: "Segur?" },
		{id: "no_groups", en: 'No Groups', es: "Sin Grupos", ca: "No Grups" },
		{id: "search_path", en: 'Search path ...', es: "Buscar ruta ...", ca: "Buscar ruta ..." }
		
		
	]
	

	
	this.findText = (id) => {
		
		let text = this.texts.find(text => {
			
			return text.id == id;
			
		});

		return text ? text[this.language] : "";
		
	}
	
}
