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
		    case 'cmdFeeds':
				this.controller.pushScene("feeds");
			    break;
			case 'cmdMap':
				this.controller.pushScene("map");
			    break;
			case 'cmdNeighborhoodMap':
				this.controller.pushScene("neighborhood");
			    break;
			case 'cmdMetroMap':
				this.controller.pushScene("publictransport");
			    break;
			case 'cmdTramMap':
				this.controller.pushScene("tram");
			    break;
			case 'cmdHelp':
				this.controller.pushScene("help");
			    break;
		}
	}
}
