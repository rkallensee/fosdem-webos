var ScheduleViewSubmenuModel = {
    label: $L('Show'), 
    items: [
        {label: $L('Schedule'), command: 'cmdSchedule', shortcut: 's'},
        {label: $L('Campus map'), command: 'cmdMap', shortcut: 'm'},
        {label: $L('OSM neighborhood map'), command: 'cmdNeighborhoodMap', shortcut: 'n'},
        {label: $L('Metro/Tram map'), command: 'cmdMetroMap', shortcut: 'p'},
        {label: $L('Help'), command: 'cmdHelp', shortcut: 'h'}
	]
};
