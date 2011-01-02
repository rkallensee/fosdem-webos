function StageAssistant() {
}

StageAssistant.prototype.setup = function() {
    this.controller.pushScene("schedule");
}

StageAssistant.prototype.handleCommand = function(event) {
	if( event.type == Mojo.Event.command ) {
		switch( event.command )
		{
			case 'cmdSchedule':
				this.controller.pushScene("schedule");
			    break;
			case 'cmdMap':
				this.controller.pushScene("map");
			    break;
			case 'cmdHelp':
				this.controller.pushScene("help");
			    break;
		}
	}
}
