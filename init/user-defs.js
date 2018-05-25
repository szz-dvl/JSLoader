/* Those are example definitions, won't be persisted or loaded 
   until you decide so. */

this.video = ["webm", "mp4", "ogg", "mkv"];

this.isNativeVideoExtension = (ext) => {
	return this.video.includes(ext);
};

this.getNamedInputValue = (name) => {
	return $("input[name=" + name + "]").attr("value");
}; 
