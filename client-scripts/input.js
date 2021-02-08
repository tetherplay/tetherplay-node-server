var state = []

var targetCache = {};
function getDownEventTarget(evt) {
	for (i = 0; i < evt.path.length; i++) {
		var target = evt.path[i]
		if (configuration.hasId(target.id)) {
			targetCache[evt.pointerId] = target
			return target
		}
	}
	return undefined
}
function getLifetimeEventTarget(evt) {
	return targetCache[evt.pointerId]
}

function encodeState(index) {
	return JSON.stringify({i:index, v:state[index].valueOf()})
}

function onStateUpdate(which = null) {
	if (which) {
		send(encodeState(state.indexOf(which)))
	} else {
		for(i = 0; i < state.length; i++)
			{send(encodeState(i))}
	}
	showState()
}

function getControlByElement(element) {
	return state[configuration.byId(element.id).index]
}

function callControlMethod(element, method, ...args) {
	if (!element)
		{ return }
	return getControlByElement(element)[method](...args)
}

function processEvent(evt) {
	evt.preventDefault()
	evt.path = evt.path || (evt.composedPath && evt.composedPath()); // event.path is nonstandard
}

function handlePressEvent(evt) {
	callControlMethod( getDownEventTarget( evt ), "onPress", evt)
}

function handleReleaseEvent(evt) {
	callControlMethod( getLifetimeEventTarget( evt ), "onRelease", evt)
}

function handleDragEvent(evt) {
	callControlMethod( getLifetimeEventTarget( evt ), "onDrag", evt)
}
