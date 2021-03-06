class MonodirectionalModeSwitch {
	constructor( subModeSwitches=[]) {
		this.children = subModeSwitches
		this.enableCallbacks = []
		this.disableCallbacks = []
		this.antiLoop = 0
	}
	apply(state=undefined) {
		if (state == undefined) {
			if (this.enabled == undefined)
				state = true
			else
				state = this.enabled
		}

		if (state)
			this.enable()
		else
			this.disable()
	}
	enable() {
		try {
			if (this.enabled !== true)
				this.unsafe_enable()
		} catch(e) {
			this.antiLoop++
			if(this.antiLoop > 1)
				throw new Error("Failed to properly set all switches")
			try {
				this.disable()
			} catch(e) {
				console.error(e)
			}
		}
		this.antiLoop = 0
	}
	disable() {
		try {
			if (this.enabled !== false)
				this.unsafe_disable()
		} catch(e) {
			this.antiLoop++
			if(this.antiLoop > 1)
				throw new Error("Failed to properly set all switches")
			try {
				this.enable()
			} catch(e) {
				console.error(e)
			}
		}
		this.antiLoop = 0
	}
	unsafe_enable() {
		this.enabled = true
		this.children.forEach(child => child.enable())
		this.enableCallbacks.forEach(f => f())
	}
	unsafe_disable() {
		this.enabled = false
		this.children.forEach(child => child.disable())
		this.disableCallbacks.forEach(f => f())
	}
	toggle()
		{ this.apply(!this.enabled) }

	addEnableListener(fn)
		{ this.enableCallbacks.push(fn) }
	addDisableListener(fn)
		{ this.disableCallbacks.push(fn) }
	listen(modeSwitch) {
		modeSwitch.addEnableListener(this.enable.bind(this))
		modeSwitch.addDisableListener(this.disable.bind(this))
	}
}

class ModeSwitch extends MonodirectionalModeSwitch{
	constructor(subModeSwitches=[]) {
		super(subModeSwitches)
		subModeSwitches.forEach(child => this.listen(child))
	}
}

class InverseSwitch extends ModeSwitch{
	unsafe_enable() {
		this.enabled = true
		this.children.forEach(child => child.disable())
		this.enableCallbacks.forEach(f => f())
	}

	unsafe_disable() {
		this.enabled = false
		this.children.forEach(child => child.enable())
		this.disableCallbacks.forEach(f => f())
	}

	listen(modeSwitch) {
		modeSwitch.addEnableListener(this.disable.bind(this))
		modeSwitch.addDisableListener(this.enable.bind(this))
	}

}

class EnabledSwitch extends ModeSwitch {
	disable() {
		this.enable()
		throw new Error("Disabling not allowed")
	}
	apply()
		{ this.enable() }
}

class DisabledSwitch extends ModeSwitch {
	enable() {
		this.disable()
		throw new Error("enabling not allowed")
	}
	apply()
		{ this.disable() }
}

class VisibilitySwitch extends ModeSwitch {
	constructor( elemID, subModeSwitches=[]) {
		super(subModeSwitches)
		this.element = document.getElementById(elemID)
	}
	unsafe_enable() {
		super.unsafe_enable()
		this.element.classList.toggle('hidden', false)
	}
	unsafe_disable() {
		super.unsafe_disable()
		this.element.classList.toggle('hidden', true)
	}
}

class TextSwitch extends ModeSwitch {
	constructor( elemID, enabledText, disabledText, subModeSwitches=[] ) {
		super(subModeSwitches)
		this.element = document.getElementById(elemID)
		this.enabledText = enabledText ? enabledText : this.element.innerHTML
		this.disabledText = disabledText ? disabledText : this.element.innerHTML
	}
	unsafe_enable() {
		super.unsafe_enable()
		this.element.innerHTML = this.enabledText
	}
	unsafe_disable() {
		super.unsafe_disable()
		this.element.innerHTML = this.disabledText
	}
}

class OnClickSwitch extends ModeSwitch {
	constructor( elemID, subModeSwitches=[]) {
		super(subModeSwitches)
		this.element = document.getElementById(elemID)
		this.boundHandler = this.disable.bind(this)
	}
	unsafe_enable() {
		super.unsafe_enable()
		this.element.addEventListener("click", this.boundHandler)
	}
	unsafe_disable() {
		super.unsafe_disable()
		this.element.removeEventListener("click", this.boundHandler)
	}
}

class OnClickToggleSwitch extends ModeSwitch {
	constructor( elemID, subModeSwitches=[]) {
		super(subModeSwitches)
		this.element = document.getElementById(elemID)
		this.boundHandler = this.toggle.bind(this)
		this.element.addEventListener("click", this.boundHandler)
	}
}

class FullscreenSwitch extends ModeSwitch {
	constructor( subModeSwitches=[]) {
		super(subModeSwitches)

		/* FIXME: does not fully detect fullscreenchange on desktop browsers */
		document.addEventListener('fullscreenchange', this.handleFullscreenEvent.bind(this))
	}

	unsafe_enable() {
		super.unsafe_enable()
		var de = window.document.documentElement;

		var requestFullScreen = de.requestFullscreen ||
			de.mozRequestFullScreen ||
			de.webkitRequestFullScreen ||
			de.msRequestFullscreen;

		requestFullScreen.call(de);
	}
	unsafe_disable() {
		super.unsafe_disable()
	}

	isFullscreen() {
		return document.fullscreenElement ||
			document.webkitCurrentFullscreenElement ||
			document.mozFullScreenElement
	}

	handleFullscreenEvent() {
		if (this.isFullscreen())
			this.enable()
		else
			this.disable()
	}
}

class DualSwitch extends ModeSwitch {
	constructor( activeSwitches=[], inactiveSwitches=[]) {
		super(activeSwitches)
		this.inverseMode = new InverseSwitch(inactiveSwitches)
		this.listen(this.inverseMode)
		this.inverseMode.enable()
		this.suppressed = false
	}
	unsafe_enable() {
		if (this.suppressed) {
			if (this.unsuppressState)
				return
			throw new Error("target is  suppressed")
		}
		super.unsafe_enable()
		this.inverseMode.enable()
	}
	unsafe_disable() {
		if (this.suppressed) {
			if (this.unsuppressState == false)
				return
			throw new Error("target is  suppressed")
		}
		super.unsafe_disable()
		this.inverseMode.disable()
	}
	suppress() {
		if (this.suppressed)
			return
		if (this.enabled == undefined)
			this.apply()
		this.unsuppressState = this.enabled
		super.disable()
		this.enabled = undefined
		this.suppressed = true
		this.inverseMode.enable()
	}
	unsuppress() {
		if (this.suppressed == false)
			return
		this.suppressed = false
		this.apply(this.unsuppressState)
	}
}

class SuppressorSwitch extends MonodirectionalModeSwitch {
	unsafe_enable() {
		this.enabled = true
		this.children.forEach(child => child.unsuppress())
		this.enableCallbacks.forEach(f => f())
	}
	unsafe_disable() {
		this.enabled = false
		this.children.forEach(child => child.suppress())
		this.disableCallbacks.forEach(f => f())
	}
}
