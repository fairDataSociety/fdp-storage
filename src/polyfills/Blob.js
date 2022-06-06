/* Blob.js
 * A Blob, File, FileReader & URL implementation.
 * 2020-02-01
 *
 * By Eli Grey, https://eligrey.com
 * By Jimmy Wärting, https://github.com/jimmywarting
 * License: MIT
 *   See https://github.com/eligrey/Blob.js/blob/master/LICENSE.md
 */

;(function (global) {
  ;(function (factory) {
    if (typeof define === 'function' && define.amd) {
      // AMD. Register as an anonymous module.
      define(['exports'], factory)
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
      // CommonJS
      factory(exports)
    } else {
      // Browser globals
      factory(global)
    }
  })(function (exports) {
    'use strict'

    exports.Blob = Blob
  })
})(
  (typeof self !== 'undefined' && self) ||
    (typeof window !== 'undefined' && window) ||
    (typeof global !== 'undefined' && global) ||
    this,
)
