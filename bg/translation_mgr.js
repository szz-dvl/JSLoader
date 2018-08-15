function TranslationMgr (bg) {

	this.language = browser.i18n.getUILanguage().split("-")[0];
	
	this.texts = [

		{id: "save", en: "Save", es: "Salvar", ca: "Salvar" },
		{id: "run", en: "Run in Page", es: "Ejecutar", ca: "Executar" },
		{id: "remove", en: "Remove", es: "Eliminar", ca: "Eliminar" },
		
	]

	
	this.findText = (id) => {
		
		let text = this.texts.find(text => {
			
			return text.id == id;
			
		});

		return text ? text[this.language] : "";
		
	}
	
}
