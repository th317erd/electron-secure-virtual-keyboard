(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const factory = require('./src/client.js');

if (typeof jQuery === 'undefined')
  throw new Error('jQuery not found in the global scope');

factory(jQuery);

},{"./src/client.js":3}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

},{}],3:[function(require,module,exports){
/* global secureVirtualKeyboardIPC */

const EventEmitter = require('events');

function factory($) {
  /**
   * A wrapper over setTimeout to ease clearing and early trigger of the function.
   * @param {function} fn
   * @param {int} timeout
   * @returns {object} Returns an object { clear: <function>, trigger: <function> }
   */
  function delayFn(fn, timeout) {
    var timeoutId = setTimeout(fn, timeout);
    return {
      clear: function() {
        clearTimeout(timeoutId);
      },
      trigger: function() {
        clearTimeout(timeoutId);
        fn();
      }
    }
  }

  /**
   * A wrapper over setInterval to ease clearing and early trigger of the function.
   * @param {function} fn
   * @param {int} interval
   * @returns {object} Returns an object { clear: <function>, trigger: <function> }
   */
  function repeatFn(fn, interval) {
    var repeatId = setInterval(fn, interval);
    return {
      clear: function() {
        clearInterval(repeatId);
      },
      trigger: function() {
        clearInterval(repeatId);
        fn();
      }
    }
  }

  /**
   * Allows calling fn first at one timeout then repeadeatly at a second interval.
   * Used, to mimic keyboard button held down effect.
   * @param {function} fn
   * @param {int} delay
   * @param {int} interval
   * @returns {object} Returns an object { clear: <function>, trigger: <function> }
   */
  function delayThenRepeat(fn, delay, interval) {
    var secondInt = null;
    var firstDelay = null;

    firstDelay = delayFn(() => {
      fn();
      secondInt = repeatFn(fn, interval);
      firstDelay = null;
    }, delay);

    return {
      clear: function() {
        if (firstDelay) {
          firstDelay.clear();
        }

        if (secondInt) {
          secondInt.clear();
        }
      },
      trigger: function() {
        if (firstDelay) {
          firstDelay.trigger();
          firstDelay = null;
        }

        if (secondInt) {
          secondInt.clear();
          secondInt = null;
        }
      }
    }

  }

  /**
   * Helper class dedicated to create a keyboard layout(single state)
   */
  class KeyboardLayout extends EventEmitter {
    constructor($container, name, layout, config) {
      super();

      this.layout = layout;
      this.$container = $container;
      this.name = name;
      this.config = config;
      this.init();
    }

    init() {
      this.$layoutContainer = $('<div class="layout"></div>');
      this.$layoutContainer.addClass(this.name);
      this.$container.append(this.$layoutContainer);

      if (this.name === 'normal') {
        this.$layoutContainer.addClass('active');
      }

      // lets loop over layout once first to check if we have column layout
      // this is defined as an array of arrays. Each row containing more than one
      // string defines a new column
      var columnCount = 1;
      for (var i in this.layout) {
        var layout = this.layout[i];
        if (layout.constructor === Array) {
          if (columnCount < layout.length) {
            columnCount = layout.length;
          }
        }
      }

      // build column containers
      for (var i = 0; i < columnCount; i++) {
        this.$layoutContainer.append('<div class="kb-column"></div>');
      }

      // lets parse through layout lines and build keys
      var layoutKeys = Object.keys(this.layout);
      for (var i = 0, il = layoutKeys.length; i < il; i++) {
        var layoutKey = layoutKeys[i];
        var layout    = this.layout[layoutKey];

        if (!Array.isArray(layout)) {
          layout = [ layout ];
        }

        var columnKeys = Object.keys(layout);
        for (var j = 0, jl = columnKeys.length; j < jl; j++) {
          var columnKey = columnKeys[j];

          var $row = $('<div class="kb-row"></div>');
          this.$layoutContainer.find('.kb-column').eq(columnKey).append($row);

          var keys = layout[columnKey].split(/\s+/m);
          for (var k = 0, kl = keys.length; k < kl; k++) {
            var key = keys[k];

            var custom  = null;
            var $key    = $(this.config.keyTemplate);
            var text    = (key.length > 1) ? key.replace(/[\{\}]/gm, '') : key;
            var parts   = (text === ":") ? [":"] : text.split(':');

            var modifier = {
              mod:      null,
              applied:  [],
            };

            if (parts.length > 1) {
              text = parts[0];
              modifier.mod = parts[1];
            }

            $key.text(text);
            $row.append($key);

            // test modifiers
            if ($.fn.keyboard_custom_modifiers && modifier.mod) {
              for (var pattern in $.fn.keyboard_custom_modifiers) {
                if (!$.fn.keyboard_custom_modifiers.hasOwnProperty(pattern))
                  continue;

                var patternRx = new RegExp(pattern, 'ig');

                if (modifier.mod.search(patternRx) > -1) {
                  $.fn.keyboard_custom_modifiers[pattern](this.keyboard, $key, modifier);
                }
              }
            }

            // test config.customKeys to apply customizations
            if (this.config.customKeys) {
              for (var pattern in this.config.customKeys) {
                if (!this.config.customKeys.hasOwnProperty(pattern))
                  continue;

                var patternRx = new RegExp(pattern, 'ig');

                if (text.search(patternRx) > -1) {
                  custom = this.config.customKeys[pattern];
                  if (custom.render) {
                    custom.render(this.keyboard, $key, modifier);
                  }
                }
              }
            }

            if (custom && custom.handler) {
              $key.data('kb-key-handler', custom.handler);
            }

            $key.data('kb-key', text);
          }
        }
      }
    }
  }

  /**
   * The Virtual Keyboard class holds all behaviour and rendering for our keyboard.
   */
  class VirtualKeyboard extends EventEmitter {
    constructor($el, config) {
      super();

      this.$el = $el;
      this.config = Object.assign({
        individual:     false,
        theme:          null,
        show:           false,
        displayOnFocus: true,
        container:      null,
        autoPosition:   true,
        layout:         'us-en',
        keyTemplate:    '<span class="key"></span>',
        customKeys:     Object.assign({}, $.fn.keyboard_custom_keys || {}),
        closeButton:    true,
      }, config || {});

      this.inited = false;

      // replace layout key for layout definition lookup on $.fn.keyboard_layouts
      if (typeof this.config.layout === 'string' || this.config.layout instanceof String) {
        this.config.layout = $.fn.keyboard_layouts[this.config.layout];
      }

      this._onMouseDown = false;

      this.init();
    }

    /**
     * Initializes our keyboard rendering and event handing.
     */
    init() {
      if (this.inited) {
        console.warn("Keyboard already initialized...");
        return;
      }

      var base = this;

      // build a defaut container if we don't get one from client
      // by default we'll just float under the input element
      // otherwise we let the client implement positioning
      if (!this.config.container) {
        this.$container = $('<div class="virtual-keyboard"></div>');
        $('body').append(this.$container);
      } else if (typeof this.config.container === 'function') {
        this.$container = this.config.container(this.$el, this);
        this.$container.addClass('virtual-keyboard');
      }

      if (this.config.theme) {
        this.$container.addClass(this.config.theme);
      }

      if (this.config.closeButton !== false) {
        var closeButton = $('<div class="kb-close-button"><span>&#x274c;</span></div>');
        closeButton.on('click', () => {
          this.hide(this.$el[0]);
        });

        this.$container.append(closeButton);
      }

      // hook up element focus events
      this.$el
        .focus(function(e) {
          if (base._onMouseDown) {
            return;
          }

          base.inputFocus(e.target);
        })
        .blur(function(e) {
          if (base._onMouseDown) {
            e.stopImmediatePropagation();
            e.preventDefault();

            return false;
          }

          base.inputUnFocus(e.target);
        });

      // hook up mouse press down/up keyboard sims
      this.$container.on("mousedown touchstart", function(e) {
        if (!base._onMouseDown && $(e.target).data('kb-key')) {
          base._onMouseDown = true;
          base.simKeyDown(e.target);

          e.stopImmediatePropagation();
          return false;
        }
      });

      $('body').on("mouseup touchend", function(e) {
        if (!base._onMouseDown)
          return;

        base._onMouseDown = false;
        base.simKeyUp(e.target);
      });

      // init layout renderer
      // break layouts into separate keyboards, we'll display them according to their
      // define behaviours later.
      this.layout = {};
      for (var k in this.config.layout) {
        if (!this.config.layout.hasOwnProperty(k))
          continue;

        if (typeof this.config.layout[k] !== 'function') {
          this.layout[k] = new KeyboardLayout(this.$container, k, this.config.layout[k], this.config);
        }
      }

      this.inited = true;

      if (this.config.show) {
        this.show(this.$el[0]);
      } else {
        this.hide(this.$el[0]);
      }
    }

    /**
     * Displays the next layout or wraps back to the first one in the layout list.
     */
    toggleLayout() {
      var $next = this.$container.find('.layout.active').next();
      if ($next.length === 0) {
        $next = this.$container.find('.layout:first');
      }

      this.$container
        .find('.layout')
        .removeClass('active');

      $next.addClass('active');
    }

    /**
     * Displays a layout by name
     * @param {string} name
     */
    showLayout(name) {
      this.$container
        .find('.layout')
        .removeClass('active');

      this.$container
        .find('.layout.' + name)
        .addClass('active');
    }

    /**
     * Handles sending keyboard key press requests to the main electron process.
     * From there we'll simulate real keyboard key presses(as far as chromium is concerned)
     * @param {string} key
     */
    pressKey(key) {
      return secureVirtualKeyboardIPC.sendKeyPress(key);
    }

    /**
     * Handles displaying the keyboard for a certain input element
     * @param {DomElement} el
     */
    show(el) {
      this.$container.show();

      if (this.config.autoPosition && typeof this.config.autoPosition !== 'function') {
        var offset = $('body').offset();
        // figure out bottom center position of the element
        var bounds = el.getBoundingClientRect();
        var position = {
          x: bounds.left + offset.left,
          y: bounds.top + offset.top,
          width: bounds.width,
          height: bounds.height,
        }

        var x = position.x + ((position.width - this.$container.width()) / 2);

        // keep container away from spilling outside window width
        if ((x + this.$container.width()) > $(window).width()) {
          x = $(window).width() - this.$container.width();
        }

        // but also make sure we don't spil out to the left window edge either(priority)
        if (x < 0) {
          x = 0;
        }

        this.$container.css({
          position: 'absolute',
          top: position.y + position.height,
          left: x,
        });
      } else if (typeof this.config.autoPosition === 'function') {
        var position = this.config.autoPosition(el, this.$container);
        this.$container.css({
          position: 'absolute',
          top: position.top,
          left: position.left,
        });
      }
    }

    /**
     * Handles hiding the keyboard.
     * @param {DomElement} el
     */
    hide(el) {
      this.$container.hide();
      if (el && typeof el.blur === 'function') {
        el.blur();
      }
    }

    /**
     * Event handler for input focus event behaviour
     * @param {DomElement} el
     */
    inputFocus(el) {
      // If we had an unfocus timeout function setup
      // and we are now focused back on an input, lets
      // cancel it and just move the keyboard into position.
      this.currentElement = el;
      if (this.unfocusTimeout) {
        this.unfocusTimeout.clear();
        this.unfocusTimeout = null;
      }

      if (this.config.displayOnFocus) {
        this.show(el);
      }
    }

    /**
     * Event handler for input blur event behaviour
     * @param {DomElement} el
     */
    inputUnFocus(el) {
      // setup a timeout to hide keyboard.
      // if the input was unfocused due to clicking on the keyboard,
      // we'll be able to cancel the delayed function.
      this.unfocusTimeout = delayFn(() => {
        if (this.config.displayOnFocus) {
          this.hide(el);
        }

        this.unfocusTimeout = null;
      }, 500);
    }

    simKeyDown(el) {
      // handle key clicks by letting them bubble to the parent container
      // from here we'll call our key presses for normal and custom keys
      // to mimic key held down effect we first trigger our key then wait
      // to call the same key on an interval. Mouse Up stops this loop.

      if (this.unfocusTimeout) {
        this.unfocusTimeout.clear();
        this.unfocusTimeout = null;
      }

      // reset focus on next loop
      setTimeout(() => {
        $(this.currentElement).focus();
      }, 1);

      // if we pressed on key, setup interval to mimic repeated key presses
      if ($(el).data('kb-key')) {
        this.keydown = delayThenRepeat(() => {
          //$(this.currentElement).focus();
          var handler = $(el).data('kb-key-handler');
          var key = $(el).data('kb-key');

          if (handler) {
            key = handler(this, $(el));
          }

          if (key != null) {
            this.pressKey(key);
          }
        }, 500, 100);
      }
    }

    simKeyUp(el) {
      // Mouse up stops key down effect. Since mousedown always presses the key at
      // least once, this event handler takes care of stoping the rest of the loop.

      if (this.keydown) {
        this.keydown.trigger();
        this.keydown = null;
      }
    }
  }

  /**
   * Creates a virtual keyboard instance on the provided elements.
   * @param {object} config
   */
  $.fn.keyboard = function(_config) {
    var config = Object.assign({}, {
      individual: false,
    }, _config || {});

    if (!_config && $(this).data('virtual-keyboard')) {
      return $(this).data('virtual-keyboard');
    }

    if (!config.individual) {
      var kb = new VirtualKeyboard($(this), config);
      $(this).data('virtual-keyboard', kb);

      return kb;
    } else {
      return $(this).each(function() {
        var kb = new VirtualKeyboard($(this), config);
        $(this).data('virtual-keyboard', kb);
      });
    }
  };

  $.fn.keyboard_custom_modifiers = {
    '(\\d+|\\*)(%|cm|em|ex|in|mm|pc|pt|px|vh|vw|vmin)?$': function(kb, $key, modifier) {
      var size = modifier.mod;
      if (size === '*') {
        $key.addClass('fill');
      } else {
        if (size && size.search('[a-z]') < 0) {
          size += 'rem';
        }

        $key.width(size);
        $key.addClass('sizer');
      }

      modifier.applied.push('size');
    }
  }

  $.fn.keyboard_custom_keys = {
    '^[`0-9~!@#$%^&*()_+\-=]$': {
      render: function(kb, $key) {
        $key.addClass('digit');
      }
    },
    '^enter$': {
      render: function(kb, $key) {
        $key.text('\u23ce ' + $key.text());
        $key.addClass('action enter');
      },
      handler: function(kb, $key) {
        return '\r';
      }
    },
    '^shift$': {
      render: function(kb, $key) {
        $key.text('\u21e7 ' + $key.text());
        $key.addClass('action shift');
      },
      handler: function(kb, $key) {
        kb.toggleLayout();
        return null;
      }
    },
    '^numeric$': {
      render: function(kb, $key) {
        $key.text('123');
      },
      handler: function(kb, $key) {
        kb.showLayout('numeric');
      }
    },
    '^abc$': {
      handler: function(kb, $key) {
        kb.showLayout('normal');
      }
    },
    '^symbols$': {
      render: function(kb, $key) {
        $key.text('#+=');
      },
      handler: function(kb, $key) {
        kb.showLayout('symbols');
      }
    },
    '^caps$': {
      render: function(kb, $key) {
        $key.text('\u21e7');
        $key.addClass('action shift');
      },
      handler: function(kb, $key) {
        kb.showLayout('shift');
        return null;
      }
    },
    '^lower$': {
      render: function(kb, $key) {
        $key.text('\u21e7');
        $key.addClass('action shift');
      },
      handler: function(kb, $key) {
        kb.showLayout('normal');
        return null;
      }
    },
    '^space$': {
      render: function(kb, $key) {
        $key.addClass('space');
      },
      handler: function(kb, $key) {
        return ' ';
      }
    },
    '^tab$': {
      render: function(kb, $key) {
        $key.addClass('action tab');
      },
      handler: function(kb, $key) {
        return '\t';
      }
    },
    '^backspace$': {
      render: function(kb, $key) {
        $key.text('  \u21e6  ');
        $key.addClass('action backspace');
      },
      handler: function(kb, $key) {
        return '\b';
      }
    },
    '^del(ete)?$': {
      render: function(kb, $key) {
        $key.addClass('action delete');
      },
      handler: function(kb, $key) {
        return String.fromCharCode(127);
      }
    },
    '^sp$': {
      render: function(kb, $key, modifier) {
        $key.empty();
        $key.addClass('spacer');
        if (modifier.applied.indexOf('size') < 0) {
          $key.addClass('fill');
        }
      },
      handler: function(kb, $key) {
        return null;
      }
    }
  }

  $.fn.keyboard_layouts = {
    'us-en': {
      'normal': [
        '{`:*} 1 2 3 4 5 6 7 8 9 0 - = {backspace:*}',
        '{tab} q w e r t y u i o p [ ] \\',
        '{sp:2} a s d f g h j k l ; \' {enter}',
        '{shift:*} z x c v b n m , . / {shift:*}',
        '{space}'
      ],
      'shift': [
        '{~:*} ! @ # $ % ^ & * ( ) _ + {backspace:*}',
        '{tab} Q W E R T Y U I O P { } |',
        '{sp:2} A S D F G H J K L : " {enter}',
        '{shift:*} Z X C V B N M < > ? {shift:*}',
        '{space}'
      ]
    },
    'us-en:with-numpad': {
      'normal': [
        '` 1 2 3 4 5 6 7 8 9 0 - = {backspace:*}',
        ['{tab} q w e r t y u i o p [ ] \\', '7 8 9'],
        ['{sp:2} a s d f g h j k l ; \' {enter}', '4 5 6'],
        ['{shift:*} z x c v b n m , . / {shift:*}', '1 2 3'],
        ['{space}', '0']
      ],
      'shift': [
        '~ ! @ # $ % ^ & * ( ) _ + {backspace:*}',
        ['{tab} Q W E R T Y U I O P { } |', '7 8 9'],
        ['{sp:2} A S D F G H J K L : " {enter}', '4 5 6'],
        ['{shift:*} Z X C V B N M < > ? {shift:*}', '1 2 3'],
        ['{space}', '0']
      ]
    },
    'us-en:mobile': {
      'normal': [
        'q w e r t y u i o p',
        'a s d f g h j k l',
        '{caps:*} z x c v b n m {backspace:*}',
        '{numeric} , {space:*} .  {enter}'
      ],
      'shift': [
        'Q W E R T Y U I O P',
        'A S D F G H J K L',
        '{lower:*} Z X C V B N M {backspace:*}',
        '{numeric} , {space:*} . {enter}'
      ],
      'numeric': [
        '1 2 3 4 5 6 7 8 9 0',
        '- / : ; ( ) $ & @ "',
        '{symbols:*} {sp} . , ? ! \' {sp} {backspace:*}',
        '{abc} , {space:*} . {enter}'
      ],
      'symbols': [
        '[ ] { } # % ^ * + =',
        '_ \ | ~ < >',
        '{numeric:*} {sp} . , ? ! \' {Sp} {backspace:*}',
        '{abc} , {space:*} . {enter}'
      ],
    },
    'us-en:mobile-with-numpad': {
      'normal': [
        ['q w e r t y u i o p', '7 8 9'],
        ['a s d f g h j k l', '4 5 6'],
        ['{caps:*} z x c v b n m {backspace:*}', '1 2 3'],
        ['{numeric} , {space:*} .  {enter}', '0:2']
      ],
      'shift': [
        ['Q W E R T Y U I O P', '& * ('],
        ['A S D F G H J K L', '$ % ^'],
        ['{lower:*} Z X C V B N M {backspace:*}', '! @ #'],
        ['{numeric} , {space:*} . {enter}', '):2']
      ],
      'numeric': [
        ['* + = - / : ; $ & @', '7 8 9'],
        ['[ ] { } ( ) # % ^ "', '4 5 6'],
        ['{lower:*} _ \\ | ~ ? ! \' {backspace:*}', '1 2 3'],
        ['{abc} < {space:*} > {enter}', '0:2']
      ]
    }
  };
}

module.exports = factory;

},{"events":2}]},{},[1]);
