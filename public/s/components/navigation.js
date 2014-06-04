/* jshint browser: true */
/* global $, libsb */
/* exported currentState */

/*
	Properties of the navigation state object:

	room: "roomid",
	embed: (toast|comment)
	view: (normal|rooms|meta|signup)
	mode: (normal|search|conf|pref|home),
	tab: (info|people|threads|local|global|<conf/pref tabs>),
	thread: "selected_thread",
	query; "search_query",
	text: "selected text id",
	time: "current scroll time"

	old: {old state object},
	changes: {new values of changed properties only}

*/

var currentState = window.currentState = {};




libsb.on("navigate", function(state, next) {
	state.old = $.extend(true, {}, currentState); // copying object by value
	state.changes = {};

	["room", "view", "theme", "embed", "mode", "tab", "thread", "query", "text", "time"].forEach(function(prop) {
		if(typeof state[prop] === "undefined") {
			if(typeof state.old[prop] !== "undefined")
				currentState[prop] = state[prop] = state.old[prop];
			return;
		}

		if (state[prop] != state.old[prop]) {
			if(state[prop] === null) {
				delete state[prop];
				delete currentState[prop];
				state.changes[prop] = null;
			} else {
				currentState[prop] = state.changes[prop] = state[prop];
			}
		} else {
			currentState[prop] = state[prop];
		}
	});

	if(!state.time && !state.room && !state.thread) {
		if(!state.time && state.old.time) {
			state.time = state.old.time;
		}
	}
	next();
}, 1000);

// On navigation, set the body classes.
libsb.on("navigate", function(state, next) {
	if (state.old && state.theme !== state.old.theme) {
		if (state.theme) {
			$("body").addClass("theme-" + state.theme);
		}
	}

	if (state.old && state.embed !== state.old.embed) {
		if (state.embed) {
			$("body").addClass("embed embed-" + state.embed);
		}
	}

	if (state.old && state.mode !== state.old.mode) {
		$(document.body).removeClass("mode-" + state.old.mode);
		$(document.body).addClass("mode-" + state.mode);
	} else if (state.mode) {
		$(document.body).addClass("mode-" + state.mode);
	}

	if (state.old && state.view !== state.old.view) {
		$(document.body).removeClass("view-" + state.old.view);
		$(document.body).addClass("view-" + state.view);
	} else if (state.view){
		$(document.body).addClass("view-" + state.view);
	}

	if (state.tab) {
		$(".tab").removeClass("current");
		$(".tab-" + state.tab).addClass("current");
	}

	next();
}, 999);

// On navigation, add history and change URLs and title
libsb.on("navigate", function(state, next) {
	if(state.source == "history"){
		return;
	}
	function buildurl() {
		var path, params = [];

		switch(state.mode) {
			case 'conf':
				path = '/' + (state.room ? state.room + '/edit': 'me');
				document.title = state.room+" - settings";
				break;
			case 'pref':
				path = '/me/edit';
				document.title = "Account settings";
				break;
			case 'search':
				path = state.room ? '/' + state.room: '';
				document.title = "Showing results: "+state.query;
				params.push('q=' + encodeURIComponent(state.query));
				break;
			case 'home':
				path = '/me';
				break;
			default:
				path = (state.room ? '/' + state.room + (
						state.thread ? '/' + state.thread:"" /*+ '/' + format.sanitize(state.thread): ''*/
					): '');
				document.title = state.room? state.room: "Scrollback.to";
		}

		if(state.time) {
			params.push('time=' + new Date(state.time).toISOString());
		}
		if(state.mode) params.push('mode=' + state.mode);
		if(state.tab) params.push('tab=' + state.tab);
		if(state.embed) params.push('embed=' + state.embed);
		if(state.theme) params.push('theme=' + state.theme);

		return path + (params.length ? '?' + params.join('&'): '');
	}

	function pushState() {
		var url = buildurl();
		if(Object.keys(state.changes).length === "") state.view = "normal";
		if(state.source == "init" || state.source == "text-area") {
			history.replaceState(state, null, url);
			return;
		}

		if((state.changes.view == "rooms" || state.changes.view == "meta" || state.changes.view =="normal") && Object.keys(state.changes).length == 1) {
			history.pushState(state, null, url);
			return;
		}else if(Object.keys(state.changes).length === 0) {
			history.pushState(state, null, url);
			return;
		}
		if (url && history.pushState && url != location.pathname + location.search && state.source !== "history") {
			if(state.changes.time && Object.keys(state.changes).length == 1) {
				history.replaceState(state, null, url);
			} else {
				history.pushState(state, null, url);
			}
		}
	}

	pushState();

	next();
}, 200);
// On history change, load the appropriate state
$(window).on("popstate", function() {
	if(!libsb.inited) return; // remove this when you enable offline access.
	if (('state' in history && history.state !== null)) {
		var state = {}, prop;
		for (prop in history.state) {
			if (history.state.hasOwnProperty(prop)) {
				if(prop !== 'old' && prop !== 'changes') {
					state[prop] = history.state[prop];
				}
			}
		}

		state.source = "history";
		libsb.emit("navigate", state);
	}

});
