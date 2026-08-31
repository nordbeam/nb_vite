import nbRoutes from "./vite-plugin-nb-routes.js";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { loadEnv, normalizePath, searchForWorkspaceRoot } from "vite";
import { relative, resolve } from "path";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region node_modules/picocolors/picocolors.js
var require_picocolors = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	let p = process || {};
	let argv = p.argv || [];
	let env = p.env || {};
	let isColorSupported = !(!!env.NO_COLOR || argv.includes("--no-color")) && (!!env.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || (p.stdout || {}).isTTY && env.TERM !== "dumb" || !!env.CI);
	let formatter = (open, close, replace = open) => (input) => {
		let string = "" + input, index = string.indexOf(close, open.length);
		return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
	};
	let replaceClose = (string, close, replace, index) => {
		let result = "", cursor = 0;
		do {
			result += string.substring(cursor, index) + replace;
			cursor = index + close.length;
			index = string.indexOf(close, cursor);
		} while (~index);
		return result + string.substring(cursor);
	};
	let createColors = (enabled = isColorSupported) => {
		let f = enabled ? formatter : () => String;
		return {
			isColorSupported: enabled,
			reset: f("\x1B[0m", "\x1B[0m"),
			bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
			dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
			italic: f("\x1B[3m", "\x1B[23m"),
			underline: f("\x1B[4m", "\x1B[24m"),
			inverse: f("\x1B[7m", "\x1B[27m"),
			hidden: f("\x1B[8m", "\x1B[28m"),
			strikethrough: f("\x1B[9m", "\x1B[29m"),
			black: f("\x1B[30m", "\x1B[39m"),
			red: f("\x1B[31m", "\x1B[39m"),
			green: f("\x1B[32m", "\x1B[39m"),
			yellow: f("\x1B[33m", "\x1B[39m"),
			blue: f("\x1B[34m", "\x1B[39m"),
			magenta: f("\x1B[35m", "\x1B[39m"),
			cyan: f("\x1B[36m", "\x1B[39m"),
			white: f("\x1B[37m", "\x1B[39m"),
			gray: f("\x1B[90m", "\x1B[39m"),
			bgBlack: f("\x1B[40m", "\x1B[49m"),
			bgRed: f("\x1B[41m", "\x1B[49m"),
			bgGreen: f("\x1B[42m", "\x1B[49m"),
			bgYellow: f("\x1B[43m", "\x1B[49m"),
			bgBlue: f("\x1B[44m", "\x1B[49m"),
			bgMagenta: f("\x1B[45m", "\x1B[49m"),
			bgCyan: f("\x1B[46m", "\x1B[49m"),
			bgWhite: f("\x1B[47m", "\x1B[49m"),
			blackBright: f("\x1B[90m", "\x1B[39m"),
			redBright: f("\x1B[91m", "\x1B[39m"),
			greenBright: f("\x1B[92m", "\x1B[39m"),
			yellowBright: f("\x1B[93m", "\x1B[39m"),
			blueBright: f("\x1B[94m", "\x1B[39m"),
			magentaBright: f("\x1B[95m", "\x1B[39m"),
			cyanBright: f("\x1B[96m", "\x1B[39m"),
			whiteBright: f("\x1B[97m", "\x1B[39m"),
			bgBlackBright: f("\x1B[100m", "\x1B[49m"),
			bgRedBright: f("\x1B[101m", "\x1B[49m"),
			bgGreenBright: f("\x1B[102m", "\x1B[49m"),
			bgYellowBright: f("\x1B[103m", "\x1B[49m"),
			bgBlueBright: f("\x1B[104m", "\x1B[49m"),
			bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
			bgCyanBright: f("\x1B[106m", "\x1B[49m"),
			bgWhiteBright: f("\x1B[107m", "\x1B[49m")
		};
	};
	module.exports = createColors();
	module.exports.createColors = createColors;
}));
//#endregion
//#region node_modules/vite-plugin-full-reload/node_modules/picomatch/lib/constants.js
var require_constants = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const path$3 = __require("path");
	const WIN_SLASH = "\\\\/";
	const WIN_NO_SLASH = `[^${WIN_SLASH}]`;
	const DEFAULT_MAX_EXTGLOB_RECURSION = 0;
	/**
	* Posix glob regex
	*/
	const DOT_LITERAL = "\\.";
	const PLUS_LITERAL = "\\+";
	const QMARK_LITERAL = "\\?";
	const SLASH_LITERAL = "\\/";
	const ONE_CHAR = "(?=.)";
	const QMARK = "[^/]";
	const END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
	const START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
	const DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
	const POSIX_CHARS = {
		DOT_LITERAL,
		PLUS_LITERAL,
		QMARK_LITERAL,
		SLASH_LITERAL,
		ONE_CHAR,
		QMARK,
		END_ANCHOR,
		DOTS_SLASH,
		NO_DOT: `(?!${DOT_LITERAL})`,
		NO_DOTS: `(?!${START_ANCHOR}${DOTS_SLASH})`,
		NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`,
		NO_DOTS_SLASH: `(?!${DOTS_SLASH})`,
		QMARK_NO_DOT: `[^.${SLASH_LITERAL}]`,
		STAR: `${QMARK}*?`,
		START_ANCHOR
	};
	/**
	* Windows glob regex
	*/
	const WINDOWS_CHARS = {
		...POSIX_CHARS,
		SLASH_LITERAL: `[${WIN_SLASH}]`,
		QMARK: WIN_NO_SLASH,
		STAR: `${WIN_NO_SLASH}*?`,
		DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
		NO_DOT: `(?!${DOT_LITERAL})`,
		NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
		NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
		NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
		QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
		START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
		END_ANCHOR: `(?:[${WIN_SLASH}]|$)`
	};
	module.exports = {
		DEFAULT_MAX_EXTGLOB_RECURSION,
		MAX_LENGTH: 65536,
		POSIX_REGEX_SOURCE: {
			__proto__: null,
			alnum: "a-zA-Z0-9",
			alpha: "a-zA-Z",
			ascii: "\\x00-\\x7F",
			blank: " \\t",
			cntrl: "\\x00-\\x1F\\x7F",
			digit: "0-9",
			graph: "\\x21-\\x7E",
			lower: "a-z",
			print: "\\x20-\\x7E ",
			punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
			space: " \\t\\r\\n\\v\\f",
			upper: "A-Z",
			word: "A-Za-z0-9_",
			xdigit: "A-Fa-f0-9"
		},
		REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
		REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
		REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
		REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
		REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
		REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
		REPLACEMENTS: {
			__proto__: null,
			"***": "*",
			"**/**": "**",
			"**/**/**": "**"
		},
		CHAR_0: 48,
		CHAR_9: 57,
		CHAR_UPPERCASE_A: 65,
		CHAR_LOWERCASE_A: 97,
		CHAR_UPPERCASE_Z: 90,
		CHAR_LOWERCASE_Z: 122,
		CHAR_LEFT_PARENTHESES: 40,
		CHAR_RIGHT_PARENTHESES: 41,
		CHAR_ASTERISK: 42,
		CHAR_AMPERSAND: 38,
		CHAR_AT: 64,
		CHAR_BACKWARD_SLASH: 92,
		CHAR_CARRIAGE_RETURN: 13,
		CHAR_CIRCUMFLEX_ACCENT: 94,
		CHAR_COLON: 58,
		CHAR_COMMA: 44,
		CHAR_DOT: 46,
		CHAR_DOUBLE_QUOTE: 34,
		CHAR_EQUAL: 61,
		CHAR_EXCLAMATION_MARK: 33,
		CHAR_FORM_FEED: 12,
		CHAR_FORWARD_SLASH: 47,
		CHAR_GRAVE_ACCENT: 96,
		CHAR_HASH: 35,
		CHAR_HYPHEN_MINUS: 45,
		CHAR_LEFT_ANGLE_BRACKET: 60,
		CHAR_LEFT_CURLY_BRACE: 123,
		CHAR_LEFT_SQUARE_BRACKET: 91,
		CHAR_LINE_FEED: 10,
		CHAR_NO_BREAK_SPACE: 160,
		CHAR_PERCENT: 37,
		CHAR_PLUS: 43,
		CHAR_QUESTION_MARK: 63,
		CHAR_RIGHT_ANGLE_BRACKET: 62,
		CHAR_RIGHT_CURLY_BRACE: 125,
		CHAR_RIGHT_SQUARE_BRACKET: 93,
		CHAR_SEMICOLON: 59,
		CHAR_SINGLE_QUOTE: 39,
		CHAR_SPACE: 32,
		CHAR_TAB: 9,
		CHAR_UNDERSCORE: 95,
		CHAR_VERTICAL_LINE: 124,
		CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
		SEP: path$3.sep,
		/**
		* Create EXTGLOB_CHARS
		*/
		extglobChars(chars) {
			return {
				"!": {
					type: "negate",
					open: "(?:(?!(?:",
					close: `))${chars.STAR})`
				},
				"?": {
					type: "qmark",
					open: "(?:",
					close: ")?"
				},
				"+": {
					type: "plus",
					open: "(?:",
					close: ")+"
				},
				"*": {
					type: "star",
					open: "(?:",
					close: ")*"
				},
				"@": {
					type: "at",
					open: "(?:",
					close: ")"
				}
			};
		},
		/**
		* Create GLOB_CHARS
		*/
		globChars(win32) {
			return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
		}
	};
}));
//#endregion
//#region node_modules/vite-plugin-full-reload/node_modules/picomatch/lib/utils.js
var require_utils = /* @__PURE__ */ __commonJSMin(((exports) => {
	const path$2 = __require("path");
	const win32 = process.platform === "win32";
	const { REGEX_BACKSLASH, REGEX_REMOVE_BACKSLASH, REGEX_SPECIAL_CHARS, REGEX_SPECIAL_CHARS_GLOBAL } = require_constants();
	exports.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
	exports.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
	exports.isRegexChar = (str) => str.length === 1 && exports.hasRegexChars(str);
	exports.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
	exports.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
	exports.removeBackslashes = (str) => {
		return str.replace(REGEX_REMOVE_BACKSLASH, (match) => {
			return match === "\\" ? "" : match;
		});
	};
	exports.supportsLookbehinds = () => {
		const segs = process.version.slice(1).split(".").map(Number);
		if (segs.length === 3 && segs[0] >= 9 || segs[0] === 8 && segs[1] >= 10) return true;
		return false;
	};
	exports.isWindows = (options) => {
		if (options && typeof options.windows === "boolean") return options.windows;
		return win32 === true || path$2.sep === "\\";
	};
	exports.escapeLast = (input, char, lastIdx) => {
		const idx = input.lastIndexOf(char, lastIdx);
		if (idx === -1) return input;
		if (input[idx - 1] === "\\") return exports.escapeLast(input, char, idx - 1);
		return `${input.slice(0, idx)}\\${input.slice(idx)}`;
	};
	exports.removePrefix = (input, state = {}) => {
		let output = input;
		if (output.startsWith("./")) {
			output = output.slice(2);
			state.prefix = "./";
		}
		return output;
	};
	exports.wrapOutput = (input, state = {}, options = {}) => {
		let output = `${options.contains ? "" : "^"}(?:${input})${options.contains ? "" : "$"}`;
		if (state.negated === true) output = `(?:^(?!${output}).*$)`;
		return output;
	};
}));
//#endregion
//#region node_modules/vite-plugin-full-reload/node_modules/picomatch/lib/scan.js
var require_scan = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const utils = require_utils();
	const { CHAR_ASTERISK, CHAR_AT, CHAR_BACKWARD_SLASH, CHAR_COMMA, CHAR_DOT, CHAR_EXCLAMATION_MARK, CHAR_FORWARD_SLASH, CHAR_LEFT_CURLY_BRACE, CHAR_LEFT_PARENTHESES, CHAR_LEFT_SQUARE_BRACKET, CHAR_PLUS, CHAR_QUESTION_MARK, CHAR_RIGHT_CURLY_BRACE, CHAR_RIGHT_PARENTHESES, CHAR_RIGHT_SQUARE_BRACKET } = require_constants();
	const isPathSeparator = (code) => {
		return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
	};
	const depth = (token) => {
		if (token.isPrefix !== true) token.depth = token.isGlobstar ? Infinity : 1;
	};
	/**
	* Quickly scans a glob pattern and returns an object with a handful of
	* useful properties, like `isGlob`, `path` (the leading non-glob, if it exists),
	* `glob` (the actual pattern), `negated` (true if the path starts with `!` but not
	* with `!(`) and `negatedExtglob` (true if the path starts with `!(`).
	*
	* ```js
	* const pm = require('picomatch');
	* console.log(pm.scan('foo/bar/*.js'));
	* { isGlob: true, input: 'foo/bar/*.js', base: 'foo/bar', glob: '*.js' }
	* ```
	* @param {String} `str`
	* @param {Object} `options`
	* @return {Object} Returns an object with tokens and regex source string.
	* @api public
	*/
	const scan = (input, options) => {
		const opts = options || {};
		const length = input.length - 1;
		const scanToEnd = opts.parts === true || opts.scanToEnd === true;
		const slashes = [];
		const tokens = [];
		const parts = [];
		let str = input;
		let index = -1;
		let start = 0;
		let lastIndex = 0;
		let isBrace = false;
		let isBracket = false;
		let isGlob = false;
		let isExtglob = false;
		let isGlobstar = false;
		let braceEscaped = false;
		let backslashes = false;
		let negated = false;
		let negatedExtglob = false;
		let finished = false;
		let braces = 0;
		let prev;
		let code;
		let token = {
			value: "",
			depth: 0,
			isGlob: false
		};
		const eos = () => index >= length;
		const peek = () => str.charCodeAt(index + 1);
		const advance = () => {
			prev = code;
			return str.charCodeAt(++index);
		};
		while (index < length) {
			code = advance();
			let next;
			if (code === CHAR_BACKWARD_SLASH) {
				backslashes = token.backslashes = true;
				code = advance();
				if (code === CHAR_LEFT_CURLY_BRACE) braceEscaped = true;
				continue;
			}
			if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
				braces++;
				while (eos() !== true && (code = advance())) {
					if (code === CHAR_BACKWARD_SLASH) {
						backslashes = token.backslashes = true;
						advance();
						continue;
					}
					if (code === CHAR_LEFT_CURLY_BRACE) {
						braces++;
						continue;
					}
					if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
						isBrace = token.isBrace = true;
						isGlob = token.isGlob = true;
						finished = true;
						if (scanToEnd === true) continue;
						break;
					}
					if (braceEscaped !== true && code === CHAR_COMMA) {
						isBrace = token.isBrace = true;
						isGlob = token.isGlob = true;
						finished = true;
						if (scanToEnd === true) continue;
						break;
					}
					if (code === CHAR_RIGHT_CURLY_BRACE) {
						braces--;
						if (braces === 0) {
							braceEscaped = false;
							isBrace = token.isBrace = true;
							finished = true;
							break;
						}
					}
				}
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_FORWARD_SLASH) {
				slashes.push(index);
				tokens.push(token);
				token = {
					value: "",
					depth: 0,
					isGlob: false
				};
				if (finished === true) continue;
				if (prev === CHAR_DOT && index === start + 1) {
					start += 2;
					continue;
				}
				lastIndex = index + 1;
				continue;
			}
			if (opts.noext !== true) {
				if ((code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK || code === CHAR_QUESTION_MARK || code === CHAR_EXCLAMATION_MARK) === true && peek() === CHAR_LEFT_PARENTHESES) {
					isGlob = token.isGlob = true;
					isExtglob = token.isExtglob = true;
					finished = true;
					if (code === CHAR_EXCLAMATION_MARK && index === start) negatedExtglob = true;
					if (scanToEnd === true) {
						while (eos() !== true && (code = advance())) {
							if (code === CHAR_BACKWARD_SLASH) {
								backslashes = token.backslashes = true;
								code = advance();
								continue;
							}
							if (code === CHAR_RIGHT_PARENTHESES) {
								isGlob = token.isGlob = true;
								finished = true;
								break;
							}
						}
						continue;
					}
					break;
				}
			}
			if (code === CHAR_ASTERISK) {
				if (prev === CHAR_ASTERISK) isGlobstar = token.isGlobstar = true;
				isGlob = token.isGlob = true;
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_QUESTION_MARK) {
				isGlob = token.isGlob = true;
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
			if (code === CHAR_LEFT_SQUARE_BRACKET) {
				while (eos() !== true && (next = advance())) {
					if (next === CHAR_BACKWARD_SLASH) {
						backslashes = token.backslashes = true;
						advance();
						continue;
					}
					if (next === CHAR_RIGHT_SQUARE_BRACKET) {
						isBracket = token.isBracket = true;
						isGlob = token.isGlob = true;
						finished = true;
						break;
					}
				}
				if (scanToEnd === true) continue;
				break;
			}
			if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
				negated = token.negated = true;
				start++;
				continue;
			}
			if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
				isGlob = token.isGlob = true;
				if (scanToEnd === true) {
					while (eos() !== true && (code = advance())) {
						if (code === CHAR_LEFT_PARENTHESES) {
							backslashes = token.backslashes = true;
							code = advance();
							continue;
						}
						if (code === CHAR_RIGHT_PARENTHESES) {
							finished = true;
							break;
						}
					}
					continue;
				}
				break;
			}
			if (isGlob === true) {
				finished = true;
				if (scanToEnd === true) continue;
				break;
			}
		}
		if (opts.noext === true) {
			isExtglob = false;
			isGlob = false;
		}
		let base = str;
		let prefix = "";
		let glob = "";
		if (start > 0) {
			prefix = str.slice(0, start);
			str = str.slice(start);
			lastIndex -= start;
		}
		if (base && isGlob === true && lastIndex > 0) {
			base = str.slice(0, lastIndex);
			glob = str.slice(lastIndex);
		} else if (isGlob === true) {
			base = "";
			glob = str;
		} else base = str;
		if (base && base !== "" && base !== "/" && base !== str) {
			if (isPathSeparator(base.charCodeAt(base.length - 1))) base = base.slice(0, -1);
		}
		if (opts.unescape === true) {
			if (glob) glob = utils.removeBackslashes(glob);
			if (base && backslashes === true) base = utils.removeBackslashes(base);
		}
		const state = {
			prefix,
			input,
			start,
			base,
			glob,
			isBrace,
			isBracket,
			isGlob,
			isExtglob,
			isGlobstar,
			negated,
			negatedExtglob
		};
		if (opts.tokens === true) {
			state.maxDepth = 0;
			if (!isPathSeparator(code)) tokens.push(token);
			state.tokens = tokens;
		}
		if (opts.parts === true || opts.tokens === true) {
			let prevIndex;
			for (let idx = 0; idx < slashes.length; idx++) {
				const n = prevIndex ? prevIndex + 1 : start;
				const i = slashes[idx];
				const value = input.slice(n, i);
				if (opts.tokens) {
					if (idx === 0 && start !== 0) {
						tokens[idx].isPrefix = true;
						tokens[idx].value = prefix;
					} else tokens[idx].value = value;
					depth(tokens[idx]);
					state.maxDepth += tokens[idx].depth;
				}
				if (idx !== 0 || value !== "") parts.push(value);
				prevIndex = i;
			}
			if (prevIndex && prevIndex + 1 < input.length) {
				const value = input.slice(prevIndex + 1);
				parts.push(value);
				if (opts.tokens) {
					tokens[tokens.length - 1].value = value;
					depth(tokens[tokens.length - 1]);
					state.maxDepth += tokens[tokens.length - 1].depth;
				}
			}
			state.slashes = slashes;
			state.parts = parts;
		}
		return state;
	};
	module.exports = scan;
}));
//#endregion
//#region node_modules/vite-plugin-full-reload/node_modules/picomatch/lib/parse.js
var require_parse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const constants = require_constants();
	const utils = require_utils();
	/**
	* Constants
	*/
	const { MAX_LENGTH, POSIX_REGEX_SOURCE, REGEX_NON_SPECIAL_CHARS, REGEX_SPECIAL_CHARS_BACKREF, REPLACEMENTS } = constants;
	/**
	* Helpers
	*/
	const expandRange = (args, options) => {
		if (typeof options.expandRange === "function") return options.expandRange(...args, options);
		args.sort();
		const value = `[${args.join("-")}]`;
		try {
			new RegExp(value);
		} catch (ex) {
			return args.map((v) => utils.escapeRegex(v)).join("..");
		}
		return value;
	};
	/**
	* Create the message for a syntax error
	*/
	const syntaxError = (type, char) => {
		return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
	};
	const splitTopLevel = (input) => {
		const parts = [];
		let bracket = 0;
		let paren = 0;
		let quote = 0;
		let value = "";
		let escaped = false;
		for (const ch of input) {
			if (escaped === true) {
				value += ch;
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				value += ch;
				escaped = true;
				continue;
			}
			if (ch === "\"") {
				quote = quote === 1 ? 0 : 1;
				value += ch;
				continue;
			}
			if (quote === 0) {
				if (ch === "[") bracket++;
				else if (ch === "]" && bracket > 0) bracket--;
				else if (bracket === 0) {
					if (ch === "(") paren++;
					else if (ch === ")" && paren > 0) paren--;
					else if (ch === "|" && paren === 0) {
						parts.push(value);
						value = "";
						continue;
					}
				}
			}
			value += ch;
		}
		parts.push(value);
		return parts;
	};
	const isPlainBranch = (branch) => {
		let escaped = false;
		for (const ch of branch) {
			if (escaped === true) {
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				continue;
			}
			if (/[?*+@!()[\]{}]/.test(ch)) return false;
		}
		return true;
	};
	const normalizeSimpleBranch = (branch) => {
		let value = branch.trim();
		let changed = true;
		while (changed === true) {
			changed = false;
			if (/^@\([^\\()[\]{}|]+\)$/.test(value)) {
				value = value.slice(2, -1);
				changed = true;
			}
		}
		if (!isPlainBranch(value)) return;
		return value.replace(/\\(.)/g, "$1");
	};
	const hasRepeatedCharPrefixOverlap = (branches) => {
		const values = branches.map(normalizeSimpleBranch).filter(Boolean);
		for (let i = 0; i < values.length; i++) for (let j = i + 1; j < values.length; j++) {
			const a = values[i];
			const b = values[j];
			const char = a[0];
			if (!char || a !== char.repeat(a.length) || b !== char.repeat(b.length)) continue;
			if (a === b || a.startsWith(b) || b.startsWith(a)) return true;
		}
		return false;
	};
	const parseRepeatedExtglob = (pattern, requireEnd = true) => {
		if (pattern[0] !== "+" && pattern[0] !== "*" || pattern[1] !== "(") return;
		let bracket = 0;
		let paren = 0;
		let quote = 0;
		let escaped = false;
		for (let i = 1; i < pattern.length; i++) {
			const ch = pattern[i];
			if (escaped === true) {
				escaped = false;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				continue;
			}
			if (ch === "\"") {
				quote = quote === 1 ? 0 : 1;
				continue;
			}
			if (quote === 1) continue;
			if (ch === "[") {
				bracket++;
				continue;
			}
			if (ch === "]" && bracket > 0) {
				bracket--;
				continue;
			}
			if (bracket > 0) continue;
			if (ch === "(") {
				paren++;
				continue;
			}
			if (ch === ")") {
				paren--;
				if (paren === 0) {
					if (requireEnd === true && i !== pattern.length - 1) return;
					return {
						type: pattern[0],
						body: pattern.slice(2, i),
						end: i
					};
				}
			}
		}
	};
	const getStarExtglobSequenceOutput = (pattern) => {
		let index = 0;
		const chars = [];
		while (index < pattern.length) {
			const match = parseRepeatedExtglob(pattern.slice(index), false);
			if (!match || match.type !== "*") return;
			const branches = splitTopLevel(match.body).map((branch) => branch.trim());
			if (branches.length !== 1) return;
			const branch = normalizeSimpleBranch(branches[0]);
			if (!branch || branch.length !== 1) return;
			chars.push(branch);
			index += match.end + 1;
		}
		if (chars.length < 1) return;
		return `${chars.length === 1 ? utils.escapeRegex(chars[0]) : `[${chars.map((ch) => utils.escapeRegex(ch)).join("")}]`}*`;
	};
	const repeatedExtglobRecursion = (pattern) => {
		let depth = 0;
		let value = pattern.trim();
		let match = parseRepeatedExtglob(value);
		while (match) {
			depth++;
			value = match.body.trim();
			match = parseRepeatedExtglob(value);
		}
		return depth;
	};
	const analyzeRepeatedExtglob = (body, options) => {
		if (options.maxExtglobRecursion === false) return { risky: false };
		const max = typeof options.maxExtglobRecursion === "number" ? options.maxExtglobRecursion : constants.DEFAULT_MAX_EXTGLOB_RECURSION;
		const branches = splitTopLevel(body).map((branch) => branch.trim());
		if (branches.length > 1) {
			if (branches.some((branch) => branch === "") || branches.some((branch) => /^[*?]+$/.test(branch)) || hasRepeatedCharPrefixOverlap(branches)) return { risky: true };
		}
		for (const branch of branches) {
			const safeOutput = getStarExtglobSequenceOutput(branch);
			if (safeOutput) return {
				risky: true,
				safeOutput
			};
			if (repeatedExtglobRecursion(branch) > max) return { risky: true };
		}
		return { risky: false };
	};
	/**
	* Parse the given input string.
	* @param {String} input
	* @param {Object} options
	* @return {Object}
	*/
	const parse = (input, options) => {
		if (typeof input !== "string") throw new TypeError("Expected a string");
		input = REPLACEMENTS[input] || input;
		const opts = { ...options };
		const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
		let len = input.length;
		if (len > max) throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
		const bos = {
			type: "bos",
			value: "",
			output: opts.prepend || ""
		};
		const tokens = [bos];
		const capture = opts.capture ? "" : "?:";
		const win32 = utils.isWindows(options);
		const PLATFORM_CHARS = constants.globChars(win32);
		const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
		const { DOT_LITERAL, PLUS_LITERAL, SLASH_LITERAL, ONE_CHAR, DOTS_SLASH, NO_DOT, NO_DOT_SLASH, NO_DOTS_SLASH, QMARK, QMARK_NO_DOT, STAR, START_ANCHOR } = PLATFORM_CHARS;
		const globstar = (opts) => {
			return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
		};
		const nodot = opts.dot ? "" : NO_DOT;
		const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
		let star = opts.bash === true ? globstar(opts) : STAR;
		if (opts.capture) star = `(${star})`;
		if (typeof opts.noext === "boolean") opts.noextglob = opts.noext;
		const state = {
			input,
			index: -1,
			start: 0,
			dot: opts.dot === true,
			consumed: "",
			output: "",
			prefix: "",
			backtrack: false,
			negated: false,
			brackets: 0,
			braces: 0,
			parens: 0,
			quotes: 0,
			globstar: false,
			tokens
		};
		input = utils.removePrefix(input, state);
		len = input.length;
		const extglobs = [];
		const braces = [];
		const stack = [];
		let prev = bos;
		let value;
		/**
		* Tokenizing helpers
		*/
		const eos = () => state.index === len - 1;
		const peek = state.peek = (n = 1) => input[state.index + n];
		const advance = state.advance = () => input[++state.index] || "";
		const remaining = () => input.slice(state.index + 1);
		const consume = (value = "", num = 0) => {
			state.consumed += value;
			state.index += num;
		};
		const append = (token) => {
			state.output += token.output != null ? token.output : token.value;
			consume(token.value);
		};
		const negate = () => {
			let count = 1;
			while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
				advance();
				state.start++;
				count++;
			}
			if (count % 2 === 0) return false;
			state.negated = true;
			state.start++;
			return true;
		};
		const increment = (type) => {
			state[type]++;
			stack.push(type);
		};
		const decrement = (type) => {
			state[type]--;
			stack.pop();
		};
		/**
		* Push tokens onto the tokens array. This helper speeds up
		* tokenizing by 1) helping us avoid backtracking as much as possible,
		* and 2) helping us avoid creating extra tokens when consecutive
		* characters are plain text. This improves performance and simplifies
		* lookbehinds.
		*/
		const push = (tok) => {
			if (prev.type === "globstar") {
				const isBrace = state.braces > 0 && (tok.type === "comma" || tok.type === "brace");
				const isExtglob = tok.extglob === true || extglobs.length && (tok.type === "pipe" || tok.type === "paren");
				if (tok.type !== "slash" && tok.type !== "paren" && !isBrace && !isExtglob) {
					state.output = state.output.slice(0, -prev.output.length);
					prev.type = "star";
					prev.value = "*";
					prev.output = star;
					state.output += prev.output;
				}
			}
			if (extglobs.length && tok.type !== "paren") extglobs[extglobs.length - 1].inner += tok.value;
			if (tok.value || tok.output) append(tok);
			if (prev && prev.type === "text" && tok.type === "text") {
				prev.value += tok.value;
				prev.output = (prev.output || "") + tok.value;
				return;
			}
			tok.prev = prev;
			tokens.push(tok);
			prev = tok;
		};
		const extglobOpen = (type, value) => {
			const token = {
				...EXTGLOB_CHARS[value],
				conditions: 1,
				inner: ""
			};
			token.prev = prev;
			token.parens = state.parens;
			token.output = state.output;
			token.startIndex = state.index;
			token.tokensIndex = tokens.length;
			const output = (opts.capture ? "(" : "") + token.open;
			increment("parens");
			push({
				type,
				value,
				output: state.output ? "" : ONE_CHAR
			});
			push({
				type: "paren",
				extglob: true,
				value: advance(),
				output
			});
			extglobs.push(token);
		};
		const extglobClose = (token) => {
			const literal = input.slice(token.startIndex, state.index + 1);
			const body = input.slice(token.startIndex + 2, state.index);
			const analysis = analyzeRepeatedExtglob(body, opts);
			if ((token.type === "plus" || token.type === "star") && analysis.risky) {
				const safeOutput = analysis.safeOutput ? (token.output ? "" : ONE_CHAR) + (opts.capture ? `(${analysis.safeOutput})` : analysis.safeOutput) : void 0;
				const open = tokens[token.tokensIndex];
				open.type = "text";
				open.value = literal;
				open.output = safeOutput || utils.escapeRegex(literal);
				for (let i = token.tokensIndex + 1; i < tokens.length; i++) {
					tokens[i].value = "";
					tokens[i].output = "";
					delete tokens[i].suffix;
				}
				state.output = token.output + open.output;
				state.backtrack = true;
				push({
					type: "paren",
					extglob: true,
					value,
					output: ""
				});
				decrement("parens");
				return;
			}
			let output = token.close + (opts.capture ? ")" : "");
			let rest;
			if (token.type === "negate") {
				let extglobStar = star;
				if (token.inner && token.inner.length > 1 && token.inner.includes("/")) extglobStar = globstar(opts);
				if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) output = token.close = `)$))${extglobStar}`;
				if (token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) output = token.close = `)${parse(rest, {
					...options,
					fastpaths: false
				}).output})${extglobStar})`;
				if (token.prev.type === "bos") state.negatedExtglob = true;
			}
			push({
				type: "paren",
				extglob: true,
				value,
				output
			});
			decrement("parens");
		};
		/**
		* Fast paths
		*/
		if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
			let backslashes = false;
			let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
				if (first === "\\") {
					backslashes = true;
					return m;
				}
				if (first === "?") {
					if (esc) return esc + first + (rest ? QMARK.repeat(rest.length) : "");
					if (index === 0) return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
					return QMARK.repeat(chars.length);
				}
				if (first === ".") return DOT_LITERAL.repeat(chars.length);
				if (first === "*") {
					if (esc) return esc + first + (rest ? star : "");
					return star;
				}
				return esc ? m : `\\${m}`;
			});
			if (backslashes === true) {
				if (opts.unescape === true) output = output.replace(/\\/g, "");
				else output = output.replace(/\\+/g, (m) => {
					return m.length % 2 === 0 ? "\\\\" : m ? "\\" : "";
				});
			}
			if (output === input && opts.contains === true) {
				state.output = input;
				return state;
			}
			state.output = utils.wrapOutput(output, state, options);
			return state;
		}
		/**
		* Tokenize input until we reach end-of-string
		*/
		while (!eos()) {
			value = advance();
			if (value === "\0") continue;
			/**
			* Escaped characters
			*/
			if (value === "\\") {
				const next = peek();
				if (next === "/" && opts.bash !== true) continue;
				if (next === "." || next === ";") continue;
				if (!next) {
					value += "\\";
					push({
						type: "text",
						value
					});
					continue;
				}
				const match = /^\\+/.exec(remaining());
				let slashes = 0;
				if (match && match[0].length > 2) {
					slashes = match[0].length;
					state.index += slashes;
					if (slashes % 2 !== 0) value += "\\";
				}
				if (opts.unescape === true) value = advance();
				else value += advance();
				if (state.brackets === 0) {
					push({
						type: "text",
						value
					});
					continue;
				}
			}
			/**
			* If we're inside a regex character class, continue
			* until we reach the closing bracket.
			*/
			if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
				if (opts.posix !== false && value === ":") {
					const inner = prev.value.slice(1);
					if (inner.includes("[")) {
						prev.posix = true;
						if (inner.includes(":")) {
							const idx = prev.value.lastIndexOf("[");
							const pre = prev.value.slice(0, idx);
							const rest = prev.value.slice(idx + 2);
							const posix = POSIX_REGEX_SOURCE[rest];
							if (posix) {
								prev.value = pre + posix;
								state.backtrack = true;
								advance();
								if (!bos.output && tokens.indexOf(prev) === 1) bos.output = ONE_CHAR;
								continue;
							}
						}
					}
				}
				if (value === "[" && peek() !== ":" || value === "-" && peek() === "]") value = `\\${value}`;
				if (value === "]" && (prev.value === "[" || prev.value === "[^")) value = `\\${value}`;
				if (opts.posix === true && value === "!" && prev.value === "[") value = "^";
				prev.value += value;
				append({ value });
				continue;
			}
			/**
			* If we're inside a quoted string, continue
			* until we reach the closing double quote.
			*/
			if (state.quotes === 1 && value !== "\"") {
				value = utils.escapeRegex(value);
				prev.value += value;
				append({ value });
				continue;
			}
			/**
			* Double quotes
			*/
			if (value === "\"") {
				state.quotes = state.quotes === 1 ? 0 : 1;
				if (opts.keepQuotes === true) push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Parentheses
			*/
			if (value === "(") {
				increment("parens");
				push({
					type: "paren",
					value
				});
				continue;
			}
			if (value === ")") {
				if (state.parens === 0 && opts.strictBrackets === true) throw new SyntaxError(syntaxError("opening", "("));
				const extglob = extglobs[extglobs.length - 1];
				if (extglob && state.parens === extglob.parens + 1) {
					extglobClose(extglobs.pop());
					continue;
				}
				push({
					type: "paren",
					value,
					output: state.parens ? ")" : "\\)"
				});
				decrement("parens");
				continue;
			}
			/**
			* Square brackets
			*/
			if (value === "[") {
				if (opts.nobracket === true || !remaining().includes("]")) {
					if (opts.nobracket !== true && opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
					value = `\\${value}`;
				} else increment("brackets");
				push({
					type: "bracket",
					value
				});
				continue;
			}
			if (value === "]") {
				if (opts.nobracket === true || prev && prev.type === "bracket" && prev.value.length === 1) {
					push({
						type: "text",
						value,
						output: `\\${value}`
					});
					continue;
				}
				if (state.brackets === 0) {
					if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("opening", "["));
					push({
						type: "text",
						value,
						output: `\\${value}`
					});
					continue;
				}
				decrement("brackets");
				const prevValue = prev.value.slice(1);
				if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) value = `/${value}`;
				prev.value += value;
				append({ value });
				if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) continue;
				const escaped = utils.escapeRegex(prev.value);
				state.output = state.output.slice(0, -prev.value.length);
				if (opts.literalBrackets === true) {
					state.output += escaped;
					prev.value = escaped;
					continue;
				}
				prev.value = `(${capture}${escaped}|${prev.value})`;
				state.output += prev.value;
				continue;
			}
			/**
			* Braces
			*/
			if (value === "{" && opts.nobrace !== true) {
				increment("braces");
				const open = {
					type: "brace",
					value,
					output: "(",
					outputIndex: state.output.length,
					tokensIndex: state.tokens.length
				};
				braces.push(open);
				push(open);
				continue;
			}
			if (value === "}") {
				const brace = braces[braces.length - 1];
				if (opts.nobrace === true || !brace) {
					push({
						type: "text",
						value,
						output: value
					});
					continue;
				}
				let output = ")";
				if (brace.dots === true) {
					const arr = tokens.slice();
					const range = [];
					for (let i = arr.length - 1; i >= 0; i--) {
						tokens.pop();
						if (arr[i].type === "brace") break;
						if (arr[i].type !== "dots") range.unshift(arr[i].value);
					}
					output = expandRange(range, opts);
					state.backtrack = true;
				}
				if (brace.comma !== true && brace.dots !== true) {
					const out = state.output.slice(0, brace.outputIndex);
					const toks = state.tokens.slice(brace.tokensIndex);
					brace.value = brace.output = "\\{";
					value = output = "\\}";
					state.output = out;
					for (const t of toks) state.output += t.output || t.value;
				}
				push({
					type: "brace",
					value,
					output
				});
				decrement("braces");
				braces.pop();
				continue;
			}
			/**
			* Pipes
			*/
			if (value === "|") {
				if (extglobs.length > 0) extglobs[extglobs.length - 1].conditions++;
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Commas
			*/
			if (value === ",") {
				let output = value;
				const brace = braces[braces.length - 1];
				if (brace && stack[stack.length - 1] === "braces") {
					brace.comma = true;
					output = "|";
				}
				push({
					type: "comma",
					value,
					output
				});
				continue;
			}
			/**
			* Slashes
			*/
			if (value === "/") {
				if (prev.type === "dot" && state.index === state.start + 1) {
					state.start = state.index + 1;
					state.consumed = "";
					state.output = "";
					tokens.pop();
					prev = bos;
					continue;
				}
				push({
					type: "slash",
					value,
					output: SLASH_LITERAL
				});
				continue;
			}
			/**
			* Dots
			*/
			if (value === ".") {
				if (state.braces > 0 && prev.type === "dot") {
					if (prev.value === ".") prev.output = DOT_LITERAL;
					const brace = braces[braces.length - 1];
					prev.type = "dots";
					prev.output += value;
					prev.value += value;
					brace.dots = true;
					continue;
				}
				if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
					push({
						type: "text",
						value,
						output: DOT_LITERAL
					});
					continue;
				}
				push({
					type: "dot",
					value,
					output: DOT_LITERAL
				});
				continue;
			}
			/**
			* Question marks
			*/
			if (value === "?") {
				if (!(prev && prev.value === "(") && opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					extglobOpen("qmark", value);
					continue;
				}
				if (prev && prev.type === "paren") {
					const next = peek();
					let output = value;
					if (next === "<" && !utils.supportsLookbehinds()) throw new Error("Node.js v10 or higher is required for regex lookbehinds");
					if (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) output = `\\${value}`;
					push({
						type: "text",
						value,
						output
					});
					continue;
				}
				if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
					push({
						type: "qmark",
						value,
						output: QMARK_NO_DOT
					});
					continue;
				}
				push({
					type: "qmark",
					value,
					output: QMARK
				});
				continue;
			}
			/**
			* Exclamation
			*/
			if (value === "!") {
				if (opts.noextglob !== true && peek() === "(") {
					if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
						extglobOpen("negate", value);
						continue;
					}
				}
				if (opts.nonegate !== true && state.index === 0) {
					negate();
					continue;
				}
			}
			/**
			* Plus
			*/
			if (value === "+") {
				if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					extglobOpen("plus", value);
					continue;
				}
				if (prev && prev.value === "(" || opts.regex === false) {
					push({
						type: "plus",
						value,
						output: PLUS_LITERAL
					});
					continue;
				}
				if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
					push({
						type: "plus",
						value
					});
					continue;
				}
				push({
					type: "plus",
					value: PLUS_LITERAL
				});
				continue;
			}
			/**
			* Plain text
			*/
			if (value === "@") {
				if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
					push({
						type: "at",
						extglob: true,
						value,
						output: ""
					});
					continue;
				}
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Plain text
			*/
			if (value !== "*") {
				if (value === "$" || value === "^") value = `\\${value}`;
				const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
				if (match) {
					value += match[0];
					state.index += match[0].length;
				}
				push({
					type: "text",
					value
				});
				continue;
			}
			/**
			* Stars
			*/
			if (prev && (prev.type === "globstar" || prev.star === true)) {
				prev.type = "star";
				prev.star = true;
				prev.value += value;
				prev.output = star;
				state.backtrack = true;
				state.globstar = true;
				consume(value);
				continue;
			}
			let rest = remaining();
			if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
				extglobOpen("star", value);
				continue;
			}
			if (prev.type === "star") {
				if (opts.noglobstar === true) {
					consume(value);
					continue;
				}
				const prior = prev.prev;
				const before = prior.prev;
				const isStart = prior.type === "slash" || prior.type === "bos";
				const afterStar = before && (before.type === "star" || before.type === "globstar");
				if (opts.bash === true && (!isStart || rest[0] && rest[0] !== "/")) {
					push({
						type: "star",
						value,
						output: ""
					});
					continue;
				}
				const isBrace = state.braces > 0 && (prior.type === "comma" || prior.type === "brace");
				const isExtglob = extglobs.length && (prior.type === "pipe" || prior.type === "paren");
				if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
					push({
						type: "star",
						value,
						output: ""
					});
					continue;
				}
				while (rest.slice(0, 3) === "/**") {
					const after = input[state.index + 4];
					if (after && after !== "/") break;
					rest = rest.slice(3);
					consume("/**", 3);
				}
				if (prior.type === "bos" && eos()) {
					prev.type = "globstar";
					prev.value += value;
					prev.output = globstar(opts);
					state.output = prev.output;
					state.globstar = true;
					consume(value);
					continue;
				}
				if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
					state.output = state.output.slice(0, -(prior.output + prev.output).length);
					prior.output = `(?:${prior.output}`;
					prev.type = "globstar";
					prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
					prev.value += value;
					state.globstar = true;
					state.output += prior.output + prev.output;
					consume(value);
					continue;
				}
				if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
					const end = rest[1] !== void 0 ? "|$" : "";
					state.output = state.output.slice(0, -(prior.output + prev.output).length);
					prior.output = `(?:${prior.output}`;
					prev.type = "globstar";
					prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
					prev.value += value;
					state.output += prior.output + prev.output;
					state.globstar = true;
					consume(value + advance());
					push({
						type: "slash",
						value: "/",
						output: ""
					});
					continue;
				}
				if (prior.type === "bos" && rest[0] === "/") {
					prev.type = "globstar";
					prev.value += value;
					prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
					state.output = prev.output;
					state.globstar = true;
					consume(value + advance());
					push({
						type: "slash",
						value: "/",
						output: ""
					});
					continue;
				}
				state.output = state.output.slice(0, -prev.output.length);
				prev.type = "globstar";
				prev.output = globstar(opts);
				prev.value += value;
				state.output += prev.output;
				state.globstar = true;
				consume(value);
				continue;
			}
			const token = {
				type: "star",
				value,
				output: star
			};
			if (opts.bash === true) {
				token.output = ".*?";
				if (prev.type === "bos" || prev.type === "slash") token.output = nodot + token.output;
				push(token);
				continue;
			}
			if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
				token.output = value;
				push(token);
				continue;
			}
			if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
				if (prev.type === "dot") {
					state.output += NO_DOT_SLASH;
					prev.output += NO_DOT_SLASH;
				} else if (opts.dot === true) {
					state.output += NO_DOTS_SLASH;
					prev.output += NO_DOTS_SLASH;
				} else {
					state.output += nodot;
					prev.output += nodot;
				}
				if (peek() !== "*") {
					state.output += ONE_CHAR;
					prev.output += ONE_CHAR;
				}
			}
			push(token);
		}
		while (state.brackets > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
			state.output = utils.escapeLast(state.output, "[");
			decrement("brackets");
		}
		while (state.parens > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", ")"));
			state.output = utils.escapeLast(state.output, "(");
			decrement("parens");
		}
		while (state.braces > 0) {
			if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "}"));
			state.output = utils.escapeLast(state.output, "{");
			decrement("braces");
		}
		if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket")) push({
			type: "maybe_slash",
			value: "",
			output: `${SLASH_LITERAL}?`
		});
		if (state.backtrack === true) {
			state.output = "";
			for (const token of state.tokens) {
				state.output += token.output != null ? token.output : token.value;
				if (token.suffix) state.output += token.suffix;
			}
		}
		return state;
	};
	/**
	* Fast paths for creating regular expressions for common glob patterns.
	* This can significantly speed up processing and has very little downside
	* impact when none of the fast paths match.
	*/
	parse.fastpaths = (input, options) => {
		const opts = { ...options };
		const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
		const len = input.length;
		if (len > max) throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
		input = REPLACEMENTS[input] || input;
		const win32 = utils.isWindows(options);
		const { DOT_LITERAL, SLASH_LITERAL, ONE_CHAR, DOTS_SLASH, NO_DOT, NO_DOTS, NO_DOTS_SLASH, STAR, START_ANCHOR } = constants.globChars(win32);
		const nodot = opts.dot ? NO_DOTS : NO_DOT;
		const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
		const capture = opts.capture ? "" : "?:";
		const state = {
			negated: false,
			prefix: ""
		};
		let star = opts.bash === true ? ".*?" : STAR;
		if (opts.capture) star = `(${star})`;
		const globstar = (opts) => {
			if (opts.noglobstar === true) return star;
			return `(${capture}(?:(?!${START_ANCHOR}${opts.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
		};
		const create = (str) => {
			switch (str) {
				case "*": return `${nodot}${ONE_CHAR}${star}`;
				case ".*": return `${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "*.*": return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "*/*": return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
				case "**": return nodot + globstar(opts);
				case "**/*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
				case "**/*.*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
				case "**/.*": return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
				default: {
					const match = /^(.*?)\.(\w+)$/.exec(str);
					if (!match) return;
					const source = create(match[1]);
					if (!source) return;
					return source + DOT_LITERAL + match[2];
				}
			}
		};
		let source = create(utils.removePrefix(input, state));
		if (source && opts.strictSlashes !== true) source += `${SLASH_LITERAL}?`;
		return source;
	};
	module.exports = parse;
}));
//#endregion
//#region node_modules/vite-plugin-full-reload/node_modules/picomatch/lib/picomatch.js
var require_picomatch$1 = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const path$1 = __require("path");
	const scan = require_scan();
	const parse = require_parse();
	const utils = require_utils();
	const constants = require_constants();
	const isObject = (val) => val && typeof val === "object" && !Array.isArray(val);
	/**
	* Creates a matcher function from one or more glob patterns. The
	* returned function takes a string to match as its first argument,
	* and returns true if the string is a match. The returned matcher
	* function also takes a boolean as the second argument that, when true,
	* returns an object with additional information.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch(glob[, options]);
	*
	* const isMatch = picomatch('*.!(*a)');
	* console.log(isMatch('a.a')); //=> false
	* console.log(isMatch('a.b')); //=> true
	* ```
	* @name picomatch
	* @param {String|Array} `globs` One or more glob patterns.
	* @param {Object=} `options`
	* @return {Function=} Returns a matcher function.
	* @api public
	*/
	const picomatch = (glob, options, returnState = false) => {
		if (Array.isArray(glob)) {
			const fns = glob.map((input) => picomatch(input, options, returnState));
			const arrayMatcher = (str) => {
				for (const isMatch of fns) {
					const state = isMatch(str);
					if (state) return state;
				}
				return false;
			};
			return arrayMatcher;
		}
		const isState = isObject(glob) && glob.tokens && glob.input;
		if (glob === "" || typeof glob !== "string" && !isState) throw new TypeError("Expected pattern to be a non-empty string");
		const opts = options || {};
		const posix = utils.isWindows(options);
		const regex = isState ? picomatch.compileRe(glob, options) : picomatch.makeRe(glob, options, false, true);
		const state = regex.state;
		delete regex.state;
		let isIgnored = () => false;
		if (opts.ignore) {
			const ignoreOpts = {
				...options,
				ignore: null,
				onMatch: null,
				onResult: null
			};
			isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
		}
		const matcher = (input, returnObject = false) => {
			const { isMatch, match, output } = picomatch.test(input, regex, options, {
				glob,
				posix
			});
			const result = {
				glob,
				state,
				regex,
				posix,
				input,
				output,
				match,
				isMatch
			};
			if (typeof opts.onResult === "function") opts.onResult(result);
			if (isMatch === false) {
				result.isMatch = false;
				return returnObject ? result : false;
			}
			if (isIgnored(input)) {
				if (typeof opts.onIgnore === "function") opts.onIgnore(result);
				result.isMatch = false;
				return returnObject ? result : false;
			}
			if (typeof opts.onMatch === "function") opts.onMatch(result);
			return returnObject ? result : true;
		};
		if (returnState) matcher.state = state;
		return matcher;
	};
	/**
	* Test `input` with the given `regex`. This is used by the main
	* `picomatch()` function to test the input string.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.test(input, regex[, options]);
	*
	* console.log(picomatch.test('foo/bar', /^(?:([^/]*?)\/([^/]*?))$/));
	* // { isMatch: true, match: [ 'foo/', 'foo', 'bar' ], output: 'foo/bar' }
	* ```
	* @param {String} `input` String to test.
	* @param {RegExp} `regex`
	* @return {Object} Returns an object with matching info.
	* @api public
	*/
	picomatch.test = (input, regex, options, { glob, posix } = {}) => {
		if (typeof input !== "string") throw new TypeError("Expected input to be a string");
		if (input === "") return {
			isMatch: false,
			output: ""
		};
		const opts = options || {};
		const format = opts.format || (posix ? utils.toPosixSlashes : null);
		let match = input === glob;
		let output = match && format ? format(input) : input;
		if (match === false) {
			output = format ? format(input) : input;
			match = output === glob;
		}
		if (match === false || opts.capture === true) {
			if (opts.matchBase === true || opts.basename === true) match = picomatch.matchBase(input, regex, options, posix);
			else match = regex.exec(output);
		}
		return {
			isMatch: Boolean(match),
			match,
			output
		};
	};
	/**
	* Match the basename of a filepath.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.matchBase(input, glob[, options]);
	* console.log(picomatch.matchBase('foo/bar.js', '*.js'); // true
	* ```
	* @param {String} `input` String to test.
	* @param {RegExp|String} `glob` Glob pattern or regex created by [.makeRe](#makeRe).
	* @return {Boolean}
	* @api public
	*/
	picomatch.matchBase = (input, glob, options, posix = utils.isWindows(options)) => {
		return (glob instanceof RegExp ? glob : picomatch.makeRe(glob, options)).test(path$1.basename(input));
	};
	/**
	* Returns true if **any** of the given glob `patterns` match the specified `string`.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.isMatch(string, patterns[, options]);
	*
	* console.log(picomatch.isMatch('a.a', ['b.*', '*.a'])); //=> true
	* console.log(picomatch.isMatch('a.a', 'b.*')); //=> false
	* ```
	* @param {String|Array} str The string to test.
	* @param {String|Array} patterns One or more glob patterns to use for matching.
	* @param {Object} [options] See available [options](#options).
	* @return {Boolean} Returns true if any patterns match `str`
	* @api public
	*/
	picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
	/**
	* Parse a glob pattern to create the source string for a regular
	* expression.
	*
	* ```js
	* const picomatch = require('picomatch');
	* const result = picomatch.parse(pattern[, options]);
	* ```
	* @param {String} `pattern`
	* @param {Object} `options`
	* @return {Object} Returns an object with useful properties and output to be used as a regex source string.
	* @api public
	*/
	picomatch.parse = (pattern, options) => {
		if (Array.isArray(pattern)) return pattern.map((p) => picomatch.parse(p, options));
		return parse(pattern, {
			...options,
			fastpaths: false
		});
	};
	/**
	* Scan a glob pattern to separate the pattern into segments.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.scan(input[, options]);
	*
	* const result = picomatch.scan('!./foo/*.js');
	* console.log(result);
	* { prefix: '!./',
	*   input: '!./foo/*.js',
	*   start: 3,
	*   base: 'foo',
	*   glob: '*.js',
	*   isBrace: false,
	*   isBracket: false,
	*   isGlob: true,
	*   isExtglob: false,
	*   isGlobstar: false,
	*   negated: true }
	* ```
	* @param {String} `input` Glob pattern to scan.
	* @param {Object} `options`
	* @return {Object} Returns an object with
	* @api public
	*/
	picomatch.scan = (input, options) => scan(input, options);
	/**
	* Compile a regular expression from the `state` object returned by the
	* [parse()](#parse) method.
	*
	* @param {Object} `state`
	* @param {Object} `options`
	* @param {Boolean} `returnOutput` Intended for implementors, this argument allows you to return the raw output from the parser.
	* @param {Boolean} `returnState` Adds the state to a `state` property on the returned regex. Useful for implementors and debugging.
	* @return {RegExp}
	* @api public
	*/
	picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
		if (returnOutput === true) return state.output;
		const opts = options || {};
		const prepend = opts.contains ? "" : "^";
		const append = opts.contains ? "" : "$";
		let source = `${prepend}(?:${state.output})${append}`;
		if (state && state.negated === true) source = `^(?!${source}).*$`;
		const regex = picomatch.toRegex(source, options);
		if (returnState === true) regex.state = state;
		return regex;
	};
	/**
	* Create a regular expression from a parsed glob pattern.
	*
	* ```js
	* const picomatch = require('picomatch');
	* const state = picomatch.parse('*.js');
	* // picomatch.compileRe(state[, options]);
	*
	* console.log(picomatch.compileRe(state));
	* //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	* ```
	* @param {String} `state` The object returned from the `.parse` method.
	* @param {Object} `options`
	* @param {Boolean} `returnOutput` Implementors may use this argument to return the compiled output, instead of a regular expression. This is not exposed on the options to prevent end-users from mutating the result.
	* @param {Boolean} `returnState` Implementors may use this argument to return the state from the parsed glob with the returned regular expression.
	* @return {RegExp} Returns a regex created from the given pattern.
	* @api public
	*/
	picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
		if (!input || typeof input !== "string") throw new TypeError("Expected a non-empty string");
		let parsed = {
			negated: false,
			fastpaths: true
		};
		if (options.fastpaths !== false && (input[0] === "." || input[0] === "*")) parsed.output = parse.fastpaths(input, options);
		if (!parsed.output) parsed = parse(input, options);
		return picomatch.compileRe(parsed, options, returnOutput, returnState);
	};
	/**
	* Create a regular expression from the given regex source string.
	*
	* ```js
	* const picomatch = require('picomatch');
	* // picomatch.toRegex(source[, options]);
	*
	* const { output } = picomatch.parse('*.js');
	* console.log(picomatch.toRegex(output));
	* //=> /^(?:(?!\.)(?=.)[^/]*?\.js)$/
	* ```
	* @param {String} `source` Regular expression source string.
	* @param {Object} `options`
	* @return {RegExp}
	* @api public
	*/
	picomatch.toRegex = (source, options) => {
		try {
			const opts = options || {};
			return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
		} catch (err) {
			if (options && options.debug === true) throw err;
			return /$^/;
		}
	};
	/**
	* Picomatch constants.
	* @return {Object}
	*/
	picomatch.constants = constants;
	/**
	* Expose "picomatch"
	*/
	module.exports = picomatch;
}));
//#endregion
//#region node_modules/vite-plugin-full-reload/node_modules/picomatch/index.js
var require_picomatch = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_picomatch$1();
}));
//#endregion
//#region node_modules/vite-plugin-full-reload/dist/index.js
var import_picocolors = /* @__PURE__ */ __toESM(require_picocolors(), 1);
var import_picomatch = /* @__PURE__ */ __toESM(require_picomatch(), 1);
function normalizePaths(root, path) {
	return (Array.isArray(path) ? path : [path]).map((path2) => resolve(root, path2)).map(normalizePath);
}
var src_default = (paths, config = {}) => ({
	name: "vite-plugin-full-reload",
	apply: "serve",
	config: () => ({ server: { watch: { disableGlobbing: false } } }),
	configureServer({ watcher, ws, config: { logger } }) {
		const { root = process.cwd(), log = true, always = true, delay = 0 } = config;
		const files = normalizePaths(root, paths);
		const shouldReload = (0, import_picomatch.default)(files);
		const checkReload = (path) => {
			if (shouldReload(path)) {
				setTimeout(() => ws.send({
					type: "full-reload",
					path: always ? "*" : path
				}), delay);
				if (log) logger.info(`${import_picocolors.default.green("full reload")} ${import_picocolors.default.dim(relative(root, path))}`, {
					clear: true,
					timestamp: true
				});
			}
		};
		watcher.add(files);
		watcher.on("add", checkReload);
		watcher.on("change", checkReload);
	}
});
//#endregion
//#region src/index.ts
let exitHandlersBound = false;
const refreshPaths = [
	"lib/**/*.ex",
	"lib/**/*.heex",
	"lib/**/*.eex",
	"lib/**/*.leex",
	"lib/**/*.sface",
	"priv/gettext/**/*.po"
].filter((path) => fs.existsSync(path.replace(/\*\*$/, "")));
function phoenix(config) {
	const pluginConfig = resolvePluginConfig(config);
	return [resolvePhoenixPlugin(pluginConfig), ...resolveFullReloadConfig(pluginConfig)];
}
/**
* Resolve the Phoenix plugin configuration.
*/
function resolvePluginConfig(config) {
	if (typeof config === "undefined") throw new Error("phoenix-vite-plugin: Missing configuration. Please provide an input path or a configuration object.");
	if (typeof config === "string" || Array.isArray(config)) config = {
		input: config,
		ssr: config
	};
	if (typeof config.input === "undefined") throw new Error("phoenix-vite-plugin: Missing configuration for \"input\". Please specify the entry point(s) for your application.");
	const validateInputPath = (inputPath) => {
		const resolvedPath = path.resolve(process.cwd(), inputPath);
		if (!fs.existsSync(resolvedPath)) console.warn(`[nb-vite] ${import_picocolors.default.yellow("Warning")}: Input file "${inputPath}" does not exist. Make sure to create it before running Vite.`);
	};
	if (typeof config.input === "string") validateInputPath(config.input);
	else if (Array.isArray(config.input)) config.input.forEach((input) => {
		if (typeof input === "string") validateInputPath(input);
	});
	if (typeof config.publicDirectory === "string") {
		config.publicDirectory = config.publicDirectory.trim().replace(/^\/+/, "");
		if (config.publicDirectory === "") throw new Error("phoenix-vite-plugin: publicDirectory must be a subdirectory. E.g. 'priv/static'. Got empty string after normalization.");
		const publicDirPath = path.resolve(process.cwd(), config.publicDirectory);
		if (!fs.existsSync(publicDirPath)) console.warn(`[nb-vite] ${import_picocolors.default.yellow("Warning")}: Public directory "${config.publicDirectory}" does not exist. It will be created during build.`);
	}
	if (config.publicDirectory === void 0) config.publicDirectory = "priv/static";
	if (typeof config.buildDirectory === "string") {
		config.buildDirectory = config.buildDirectory.trim().replace(/^\/+/, "").replace(/\/+$/, "");
		if (config.buildDirectory === "") throw new Error("phoenix-vite-plugin: buildDirectory must be a subdirectory. E.g. 'assets'. Got empty string after normalization.");
	}
	if (config.buildDirectory === void 0) config.buildDirectory = "assets";
	if (typeof config.ssrOutputDirectory === "string") {
		config.ssrOutputDirectory = config.ssrOutputDirectory.trim().replace(/^\/+/, "").replace(/\/+$/, "");
		if (config.ssrOutputDirectory === "") throw new Error("phoenix-vite-plugin: ssrOutputDirectory must be a subdirectory. E.g. 'priv/ssr'. Got empty string after normalization.");
	}
	if (config.ssrOutputDirectory === void 0) config.ssrOutputDirectory = "priv/ssr";
	if (config.hotFile === void 0) config.hotFile = path.join("priv", "hot");
	if (config.manifestPath === void 0) config.manifestPath = path.join(config.publicDirectory, config.buildDirectory, "manifest.json");
	if (config.ssr === void 0) config.ssr = config.input;
	if (config.reactRefresh === void 0) config.reactRefresh = false;
	if (config.refresh === true) config.refresh = [{ paths: refreshPaths }];
	if (config.refresh === void 0) config.refresh = false;
	if (config.detectTls === void 0) config.detectTls = null;
	if (config.ssrDev === true) config.ssrDev = {};
	else if (config.ssrDev === void 0) config.ssrDev = typeof config.ssr === "string" ? {} : { enabled: false };
	else if (config.ssrDev === false) config.ssrDev = { enabled: false };
	if (typeof config.ssrDev === "object") {
		const ssrDev = config.ssrDev;
		if (ssrDev.enabled === void 0) ssrDev.enabled = true;
		if (ssrDev.path === void 0) ssrDev.path = "/ssr";
		if (ssrDev.healthPath === void 0) ssrDev.healthPath = "/ssr-health";
		if (ssrDev.entryPoint === void 0) ssrDev.entryPoint = typeof config.ssr === "string" ? `./${config.ssr}` : "./js/ssr.tsx";
		if (ssrDev.hotFile === void 0) ssrDev.hotFile = path.join("priv", "ssr-hot");
		config.ssrDev = ssrDev;
	}
	if (process.env.DEBUG || process.env.VERBOSE) {
		console.log(import_picocolors.default.dim("Phoenix Vite Plugin - Resolved Configuration:"));
		console.log(import_picocolors.default.dim(JSON.stringify({
			publicDirectory: config.publicDirectory,
			buildDirectory: config.buildDirectory,
			hotFile: config.hotFile,
			detectTls: config.detectTls
		}, null, 2)));
	}
	return {
		input: config.input,
		publicDirectory: config.publicDirectory,
		buildDirectory: config.buildDirectory,
		ssr: config.ssr,
		ssrOutputDirectory: config.ssrOutputDirectory,
		ssrDev: config.ssrDev,
		refresh: config.refresh,
		hotFile: config.hotFile,
		manifestPath: config.manifestPath,
		reactRefresh: config.reactRefresh,
		detectTls: config.detectTls,
		transformOnServe: config.transformOnServe ?? ((code) => code)
	};
}
/**
* Setup SSR endpoint in the Vite dev server using Module Runner API
*/
async function setupSSREndpoint(viteServer, ssrConfig) {
	console.log("[nb-vite:ssr] Initializing SSR endpoint with Module Runner...");
	const ssrEnvironment = viteServer.environments.ssr;
	const runner = ssrEnvironment.runner || await ssrEnvironment.createModuleRunner();
	let cachedRender = null;
	viteServer.watcher.on("change", async (file) => {
		const jsDir = path.resolve(viteServer.config.root, "./js");
		if (!file.startsWith(jsDir) || !file.match(/\.(tsx?|jsx?)$/)) return;
		const fileName = file.split("/").pop() || "";
		if (fileName === "routes.js" || fileName === "routes.d.ts") {
			console.log(`[nb-vite:ssr] Skipping SSR cache invalidation for: ${file.replace(viteServer.config.root, "")}`);
			return;
		}
		console.log(`[nb-vite:ssr] File changed: ${file.replace(viteServer.config.root, "")}`);
		const mods = await viteServer.moduleGraph.getModulesByFile(file);
		if (mods) for (const mod of mods) await viteServer.moduleGraph.invalidateModule(mod);
		runner.clearCache();
		cachedRender = null;
		console.log("[nb-vite:ssr] Cache invalidated - will reload on next request");
	});
	async function loadRenderFunction() {
		if (!cachedRender) {
			const ssrEntryPath = path.resolve(viteServer.config.root, ssrConfig.entryPoint);
			console.log(`[nb-vite:ssr] Loading SSR entry: ${ssrEntryPath}`);
			const mods = await viteServer.moduleGraph.getModulesByFile(ssrEntryPath);
			if (mods) for (const mod of mods) await viteServer.moduleGraph.invalidateModule(mod);
			runner.clearCache();
			const ssrModule = await runner.import(ssrEntryPath);
			if (!ssrModule.render || typeof ssrModule.render !== "function") throw new Error("SSR entry must export a \"render\" function");
			cachedRender = ssrModule.render;
			console.log("[nb-vite:ssr] SSR render function loaded successfully");
		}
		return cachedRender;
	}
	function readBody(req) {
		return new Promise((resolve, reject) => {
			let body = "";
			req.on("data", (chunk) => body += chunk);
			req.on("end", () => resolve(body));
			req.on("error", reject);
		});
	}
	viteServer.middlewares.use(async (req, res, next) => {
		if (req.url === ssrConfig.healthPath && req.method === "GET") {
			res.setHeader("Content-Type", "application/json");
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.end(JSON.stringify({
				status: "ok",
				ready: !!cachedRender,
				mode: "vite-plugin"
			}));
			return;
		}
		next();
	});
	viteServer.middlewares.use(async (req, res, next) => {
		if (req.url !== ssrConfig.path) return next();
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type");
		if (req.method === "OPTIONS") {
			res.statusCode = 200;
			res.end();
			return;
		}
		if (req.method !== "POST") {
			res.statusCode = 405;
			res.end("Method not allowed");
			return;
		}
		try {
			const body = await readBody(req);
			const page = JSON.parse(body);
			console.log(`[nb-vite:ssr] Rendering page: ${page.component}`);
			const result = await (await loadRenderFunction())(page);
			res.setHeader("Content-Type", "application/json");
			res.end(JSON.stringify({
				success: true,
				result
			}));
			console.log(`[nb-vite:ssr] Rendered successfully`);
		} catch (error) {
			console.error("[nb-vite:ssr] Render error:", error);
			res.statusCode = 500;
			res.setHeader("Content-Type", "application/json");
			res.end(JSON.stringify({
				success: false,
				error: {
					message: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : void 0
				}
			}));
		}
	});
	console.log(`[nb-vite:ssr] SSR endpoint ready at http://localhost:${viteServer.config.server.port || 5173}${ssrConfig.path}`);
	console.log(`[nb-vite:ssr] Health check at http://localhost:${viteServer.config.server.port || 5173}${ssrConfig.healthPath}`);
	try {
		await loadRenderFunction();
	} catch (error) {
		console.error("[nb-vite:ssr] Failed to pre-load SSR entry:", error);
	}
	return { cleanup: () => {} };
}
/**
* Resolve the Phoenix plugin.
*/
function resolvePhoenixPlugin(pluginConfig) {
	let viteDevServerUrl;
	let resolvedConfig;
	let userConfig;
	const defaultAliases = { "@": path.resolve(process.cwd(), "assets/js") };
	const phoenixAliases = resolvePhoenixJSAliases();
	const colocatedAliases = resolvePhoenixColocatedAliases();
	return {
		name: "phoenix",
		enforce: "post",
		config: (config, env) => {
			userConfig = config;
			const ssr = !!userConfig.build?.ssr;
			const rootDirectory = path.resolve(userConfig.root || process.cwd());
			const environment = loadEnv(env.mode, userConfig.envDir || process.cwd(), "");
			const localDependencySupport = resolveLocalPathDependencySupport(rootDirectory);
			const assetUrl = environment.ASSET_URL ?? "assets";
			const serverConfig = env.command === "serve" ? resolveDevelopmentEnvironmentServerConfig(pluginConfig.detectTls, environment) ?? resolveEnvironmentServerConfig(environment) : void 0;
			ensureCommandShouldRunInEnvironment(env.command, environment);
			if (env.command === "serve") checkCommonConfigurationIssues(pluginConfig, environment, userConfig);
			return {
				base: userConfig.base ?? (env.command === "build" ? resolveBase(pluginConfig, assetUrl) : ""),
				publicDir: userConfig.publicDir ?? false,
				build: {
					manifest: userConfig.build?.manifest ?? (ssr ? false : true),
					ssrManifest: userConfig.build?.ssrManifest ?? (ssr ? "ssr-manifest.json" : false),
					outDir: userConfig.build?.outDir ?? resolveOutDir(pluginConfig, ssr),
					assetsDir: userConfig.build?.assetsDir ?? (ssr ? "" : "."),
					emptyOutDir: false,
					rollupOptions: { input: userConfig.build?.rollupOptions?.input ?? resolveInput(pluginConfig, ssr) },
					assetsInlineLimit: userConfig.build?.assetsInlineLimit ?? 0
				},
				resolve: {
					alias: [
						...normalizeAliasEntries(userConfig?.resolve?.alias),
						...localDependencySupport.aliases,
						...Object.entries(defaultAliases).map(([find, replacement]) => ({
							find,
							replacement
						})),
						...Object.entries(phoenixAliases).map(([find, replacement]) => ({
							find,
							replacement
						})),
						...Object.entries(colocatedAliases).map(([find, replacement]) => ({
							find,
							replacement
						}))
					],
					dedupe: [...userConfig?.resolve?.dedupe || [], ...localDependencySupport.dedupe]
				},
				ssr: { noExternal: noExternalInertiaHelpers(userConfig) },
				optimizeDeps: {
					entries: Array.isArray(pluginConfig.input) ? pluginConfig.input.filter((entry) => typeof entry === "string") : typeof pluginConfig.input === "string" ? [pluginConfig.input] : void 0,
					include: [
						"phoenix",
						"phoenix_html",
						"phoenix_live_view",
						...userConfig?.optimizeDeps?.include || []
					],
					exclude: [...userConfig?.optimizeDeps?.exclude || [], ...localDependencySupport.optimizeDepsExclude]
				},
				server: {
					origin: userConfig?.server?.origin ?? "http://__nb_vite_placeholder__.test",
					cors: userConfig?.server?.cors ?? { origin: userConfig?.server?.origin ?? [
						/^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/,
						...environment.PHX_HOST ? [environment.PHX_HOST.startsWith("http://") || environment.PHX_HOST.startsWith("https://") ? environment.PHX_HOST : `http://${environment.PHX_HOST}`] : [],
						/^https?:\/\/.*\.test(?::\d+)?$/,
						/^https?:\/\/.*\.local(?::\d+)?$/,
						/^https?:\/\/.*\.localhost(?::\d+)?$/
					] },
					fs: mergeServerFsAllow(userConfig?.server?.fs, localDependencySupport.fsAllow, rootDirectory),
					...environment.PHOENIX_DOCKER || environment.DOCKER_ENV ? {
						host: userConfig?.server?.host ?? "0.0.0.0",
						port: userConfig?.server?.port ?? (environment.VITE_PORT ? parseInt(environment.VITE_PORT) : 5173),
						strictPort: userConfig?.server?.strictPort ?? true
					} : void 0,
					...serverConfig ? {
						host: userConfig?.server?.host ?? serverConfig.host,
						hmr: userConfig?.server?.hmr === false ? false : {
							...serverConfig.hmr,
							...userConfig?.server?.hmr === true ? {} : userConfig?.server?.hmr
						},
						https: userConfig?.server?.https ?? serverConfig.https
					} : {
						host: userConfig?.server?.host ?? "127.0.0.1",
						hmr: userConfig?.server?.hmr === false ? false : { ...typeof userConfig?.server?.hmr === "object" ? userConfig.server.hmr : {} }
					}
				}
			};
		},
		configResolved(config) {
			resolvedConfig = config;
		},
		transform(code) {
			if (resolvedConfig.command === "serve") {
				code = code.replace(/http:\/\/__nb_vite_placeholder__\.test/g, viteDevServerUrl);
				if (pluginConfig.transformOnServe) return pluginConfig.transformOnServe(code, viteDevServerUrl);
			}
			return code;
		},
		async configureServer(server) {
			const envDir = server.config.envDir || process.cwd();
			const phxHost = loadEnv(server.config.mode, envDir, "PHX_HOST").PHX_HOST ?? "localhost:4000";
			if (typeof pluginConfig.ssrDev === "object" && pluginConfig.ssrDev.enabled) await setupSSREndpoint(server, pluginConfig.ssrDev);
			server.httpServer?.once("listening", () => {
				const address = server.httpServer?.address();
				const isAddressInfo = (x) => typeof x === "object";
				if (isAddressInfo(address)) {
					viteDevServerUrl = userConfig.server?.origin !== void 0 ? userConfig.server.origin : resolveDevServerUrl(address, server.config, userConfig);
					try {
						const hotContent = `${viteDevServerUrl}${server.config.base.replace(/\/$/, "")}`;
						const hotDir = path.dirname(pluginConfig.hotFile);
						if (!fs.existsSync(hotDir)) fs.mkdirSync(hotDir, { recursive: true });
						fs.writeFileSync(pluginConfig.hotFile, hotContent);
						if (process.env.DEBUG || process.env.VERBOSE) console.log(import_picocolors.default.dim(`Hot file written to: ${pluginConfig.hotFile}`));
						if (typeof pluginConfig.ssrDev === "object" && pluginConfig.ssrDev.enabled && pluginConfig.ssrDev.hotFile) try {
							const ssrUrl = `${viteDevServerUrl}${server.config.base.replace(/\/$/, "")}${pluginConfig.ssrDev.path}`;
							const ssrHotDir = path.dirname(pluginConfig.ssrDev.hotFile);
							if (!fs.existsSync(ssrHotDir)) fs.mkdirSync(ssrHotDir, { recursive: true });
							fs.writeFileSync(pluginConfig.ssrDev.hotFile, ssrUrl);
							if (process.env.DEBUG || process.env.VERBOSE) console.log(import_picocolors.default.dim(`SSR hot file written to: ${pluginConfig.ssrDev.hotFile}`));
						} catch (error) {
							console.error(`
[nb-vite] ${import_picocolors.default.red("Error")}: Failed to write SSR hot file.\nPath: ${typeof pluginConfig.ssrDev === "object" ? pluginConfig.ssrDev.hotFile : "unknown"}\nError: ${error instanceof Error ? error.message : String(error)}\n`);
						}
					} catch (error) {
						console.error(`
[nb-vite] ${import_picocolors.default.red("Error")}: Failed to write hot file.\nPath: ${pluginConfig.hotFile}\nError: ${error instanceof Error ? error.message : String(error)}\nThis may prevent Phoenix from detecting the Vite dev server.\n`);
					}
					setTimeout(() => {
						const phoenixVer = phoenixVersion();
						const pluginVer = pluginVersion();
						server.config.logger.info(`\n  ${import_picocolors.default.red(`${import_picocolors.default.bold("PHOENIX")} ${phoenixVer !== "unknown" ? phoenixVer : ""}`)}  ${import_picocolors.default.dim("plugin")} ${import_picocolors.default.bold(`v${pluginVer}`)}`);
						server.config.logger.info("");
						server.config.logger.info(`  ${import_picocolors.default.green("➜")}  ${import_picocolors.default.bold("PHX_HOST")}: ${import_picocolors.default.cyan(phxHost.replace(/:(\d+)/, (_, port) => `:${import_picocolors.default.bold(port)}`))}`);
						if (typeof resolvedConfig.server.https === "object" && typeof resolvedConfig.server.https.key === "string") {
							if (pluginConfig.detectTls) {
								if (resolvedConfig.server.https.key.includes("mkcert")) server.config.logger.info(`  ${import_picocolors.default.green("➜")}  Using mkcert certificate to secure Vite.`);
								else if (resolvedConfig.server.https.key.includes("caddy")) server.config.logger.info(`  ${import_picocolors.default.green("➜")}  Using Caddy certificate to secure Vite.`);
								else if (resolvedConfig.server.https.key.includes("priv/cert")) server.config.logger.info(`  ${import_picocolors.default.green("➜")}  Using project certificate to secure Vite.`);
								else server.config.logger.info(`  ${import_picocolors.default.green("➜")}  Using custom certificate to secure Vite.`);
							} else server.config.logger.info(`  ${import_picocolors.default.green("➜")}  Using TLS certificate to secure Vite.`);
						}
						if (pluginConfig.refresh !== false) {
							const refreshCount = Array.isArray(pluginConfig.refresh) ? pluginConfig.refresh.reduce((acc, cfg) => acc + cfg.paths.length, 0) : 0;
							if (refreshCount > 0) server.config.logger.info(`  ${import_picocolors.default.green("➜")}  Full reload enabled for ${refreshCount} file pattern(s)`);
						}
						server.config.logger.info("");
						server.config.logger.info(`  ${import_picocolors.default.green("➜")}  ${import_picocolors.default.bold("Dev Server")}: ${import_picocolors.default.cyan(viteDevServerUrl.replace(/:(\d+)/, (_, port) => `:${import_picocolors.default.bold(port)}`))}\n`);
					}, 100);
				}
			});
			if (!exitHandlersBound) {
				const clean = () => {
					if (fs.existsSync(pluginConfig.hotFile)) try {
						fs.rmSync(pluginConfig.hotFile);
						if (process.env.DEBUG || process.env.VERBOSE) console.log(import_picocolors.default.dim(`Hot file cleaned up: ${pluginConfig.hotFile}`));
					} catch (error) {
						if (process.env.DEBUG || process.env.VERBOSE) console.log(import_picocolors.default.dim(`Could not clean up hot file: ${error instanceof Error ? error.message : String(error)}`));
					}
					if (typeof pluginConfig.ssrDev === "object" && pluginConfig.ssrDev.hotFile && fs.existsSync(pluginConfig.ssrDev.hotFile)) try {
						fs.rmSync(pluginConfig.ssrDev.hotFile);
						if (process.env.DEBUG || process.env.VERBOSE) console.log(import_picocolors.default.dim(`SSR hot file cleaned up: ${pluginConfig.ssrDev.hotFile}`));
					} catch (error) {
						if (process.env.DEBUG || process.env.VERBOSE) console.log(import_picocolors.default.dim(`Could not clean up SSR hot file: ${error instanceof Error ? error.message : String(error)}`));
					}
				};
				process.on("exit", clean);
				process.on("SIGINT", () => {
					console.log(import_picocolors.default.dim("\nShutting down Vite..."));
					process.exit();
				});
				process.on("SIGTERM", () => process.exit());
				process.on("SIGHUP", () => process.exit());
				process.stdin.on("close", () => {
					if (process.env.DEBUG || process.env.VERBOSE) console.log(import_picocolors.default.dim("Phoenix process closed, shutting down Vite..."));
					process.exit(0);
				});
				process.stdin.resume();
				exitHandlersBound = true;
			}
			return () => server.middlewares.use((req, res, next) => {
				if (req.url === "/index.html") {
					res.statusCode = 404;
					res.end(fs.readFileSync(new URL("./dev-server-index.html", import.meta.url)).toString().replace(/{{ PHOENIX_VERSION }}/g, phoenixVersion()));
				}
				next();
			});
		},
		writeBundle() {
			if (!resolvedConfig.build.ssr) try {
				const viteManifestPath = path.join(resolvedConfig.build.outDir, ".vite", "manifest.json");
				if (!fs.existsSync(viteManifestPath)) {
					console.warn(`
[nb-vite] ${import_picocolors.default.yellow("Warning")}: Vite manifest not found at ${viteManifestPath}\n`);
					return;
				}
				const viteManifest = JSON.parse(fs.readFileSync(viteManifestPath, "utf-8"));
				const manifest = {};
				for (const [key, entry] of Object.entries(viteManifest)) {
					const transformedEntry = { ...entry };
					if (entry.file) transformedEntry.file = `${pluginConfig.buildDirectory}/${entry.file}`;
					if (entry.css && Array.isArray(entry.css)) transformedEntry.css = entry.css.map((css) => `${pluginConfig.buildDirectory}/${css}`);
					if (entry.assets && Array.isArray(entry.assets)) transformedEntry.assets = entry.assets.map((asset) => `${pluginConfig.buildDirectory}/${asset}`);
					manifest[key] = transformedEntry;
				}
				const manifestContent = JSON.stringify(manifest, null, 2);
				const manifestDir = path.dirname(pluginConfig.manifestPath);
				if (!fs.existsSync(manifestDir)) {
					if (process.env.DEBUG || process.env.VERBOSE) console.log(import_picocolors.default.dim(`Creating manifest directory: ${manifestDir}`));
					fs.mkdirSync(manifestDir, { recursive: true });
				}
				fs.writeFileSync(pluginConfig.manifestPath, manifestContent);
				if (process.env.DEBUG || process.env.VERBOSE) {
					console.log(import_picocolors.default.dim(`Manifest written to: ${pluginConfig.manifestPath}`));
					console.log(import_picocolors.default.dim(`Manifest entries: ${Object.keys(manifest).length}`));
				}
			} catch (error) {
				console.error(`
[nb-vite] ${import_picocolors.default.red("Error")}: Failed to generate manifest file.\nPath: ${pluginConfig.manifestPath}\nError: ${error instanceof Error ? error.message : String(error)}\n`);
				throw error;
			}
		}
	};
}
/**
* Check for common configuration issues and warn the user.
*/
function checkCommonConfigurationIssues(pluginConfig, env, userConfig) {
	if (!env.PHX_HOST) console.warn(`
[nb-vite] ${import_picocolors.default.yellow("Warning")}: PHX_HOST environment variable is not set.\nThis may cause CORS issues when accessing your Phoenix app.\nSet it in your .env file or shell: export PHX_HOST=localhost:4000\n`);
	const vitePort = userConfig.server?.port ?? (env.VITE_PORT ? parseInt(env.VITE_PORT) : 5173);
	if (env.PHX_HOST && env.PHX_HOST.includes(`:${vitePort}`)) console.warn(`
[nb-vite] ${import_picocolors.default.yellow("Warning")}: PHX_HOST (${env.PHX_HOST}) is using the same port as Vite (${vitePort}).\nThis will cause conflicts. Phoenix and Vite must run on different ports.\n`);
	if (process.platform === "linux" && env.WSL_DISTRO_NAME && !userConfig.server?.host) console.warn(`
[nb-vite] ${import_picocolors.default.yellow("Warning")}: Running in WSL without explicit host configuration.\nYou may need to set server.host to '0.0.0.0' in your vite.config.js for proper access from Windows.\n`);
	const depsPath = path.resolve(process.cwd(), "../deps");
	if (!fs.existsSync(depsPath)) console.warn(`
[nb-vite] ${import_picocolors.default.yellow("Warning")}: Phoenix deps directory not found at ${depsPath}.\nMake sure you're running Vite from the correct directory (usually the 'assets' folder).\nIf you're building in Docker, ensure the deps are available at build time.\n`);
	const nodeModulesPath = path.resolve(process.cwd(), "node_modules");
	if (!fs.existsSync(nodeModulesPath)) console.error(`
[nb-vite] ${import_picocolors.default.red("Error")}: node_modules directory not found.\nRun 'vp install' from the assets directory before building.\nIf you're building in Docker, ensure dependencies are installed in your Dockerfile before running the build.\n`);
	else {
		const vitePath = path.resolve(nodeModulesPath, "vite");
		if (!fs.existsSync(vitePath)) console.error(`
[nb-vite] ${import_picocolors.default.red("Error")}: Vite is not installed in node_modules.\nRun 'vp add -D vite-plus' to install the Vite+ toolchain.\nIf you're using a workspace setup in Docker, ensure all dependencies are properly hoisted.\n`);
	}
	const hotFileDir = path.dirname(pluginConfig.hotFile);
	if (!fs.existsSync(hotFileDir)) {
		console.warn(`
[nb-vite] ${import_picocolors.default.yellow("Warning")}: Hot file directory "${hotFileDir}" does not exist.\nCreating directory to prevent errors...\n`);
		fs.mkdirSync(hotFileDir, { recursive: true });
	}
	if (pluginConfig.reactRefresh && !userConfig.plugins?.some((p) => typeof p === "object" && p !== null && "name" in p && p.name === "@vitejs/plugin-react")) console.warn(`
[nb-vite] ${import_picocolors.default.yellow("Warning")}: reactRefresh is enabled but @vitejs/plugin-react is not detected.\nInstall and configure @vitejs/plugin-react for React refresh to work properly.\n`);
	if (env.MIX_ENV && env.MIX_ENV !== "dev" && (pluginConfig.detectTls || env.VITE_DEV_SERVER_KEY)) console.warn(`
[nb-vite] ${import_picocolors.default.yellow("Warning")}: TLS/SSL is configured but MIX_ENV is set to "${env.MIX_ENV}".\nTLS is typically only needed in development. Consider disabling it for other environments.\n`);
}
/**
* Validate the command can run in the given environment.
*/
function ensureCommandShouldRunInEnvironment(command, env) {
	if (command === "build" || env.PHOENIX_BYPASS_ENV_CHECK === "1") return;
	if (typeof env.CI !== "undefined") throw new Error("You should not run the Vite HMR server in CI environments. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1");
	if (env.MIX_ENV === "prod" || env.NODE_ENV === "production") throw new Error("You should not run the Vite HMR server in production. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1");
	if (typeof env.FLY_APP_NAME !== "undefined") throw new Error("You should not run the Vite HMR server on Fly.io. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1");
	if (typeof env.GIGALIXIR_APP_NAME !== "undefined") throw new Error("You should not run the Vite HMR server on Gigalixir. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1");
	if (typeof env.DYNO !== "undefined" && typeof env.HEROKU_APP_NAME !== "undefined") throw new Error("You should not run the Vite HMR server on Heroku. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1");
	if (typeof env.RENDER !== "undefined") throw new Error("You should not run the Vite HMR server on Render. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1");
	if (typeof env.RAILWAY_ENVIRONMENT !== "undefined") throw new Error("You should not run the Vite HMR server on Railway. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1");
	if (env.MIX_ENV === "test" && typeof env.PHOENIX_INTEGRATION_TEST === "undefined") throw new Error("You should not run the Vite HMR server in the test environment. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1 or PHOENIX_INTEGRATION_TEST=1 for integration tests that need the dev server.");
	if (typeof env.DOCKER_ENV !== "undefined" && env.DOCKER_ENV === "production") throw new Error("You should not run the Vite HMR server in production Docker containers. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1");
	if (typeof env.RELEASE_NAME !== "undefined" || typeof env.RELEASE_NODE !== "undefined") throw new Error("You should not run the Vite HMR server in an Elixir release. You should build your assets for production instead. To disable this ENV check you may set PHOENIX_BYPASS_ENV_CHECK=1");
}
/**
* The version of Phoenix being run.
*/
function phoenixVersion() {
	try {
		const possiblePaths = [
			path.join(process.cwd(), "mix.exs"),
			path.join(process.cwd(), "../mix.exs"),
			path.join(process.cwd(), "../../mix.exs")
		];
		for (const mixExsPath of possiblePaths) if (fs.existsSync(mixExsPath)) {
			const content = fs.readFileSync(mixExsPath, "utf-8");
			const versionMatch = content.match(/version:\s*"([^"]+)"/);
			if (versionMatch) return versionMatch[1];
			const phoenixMatch = content.match(/{:phoenix,\s*"~>\s*([^"]+)"/);
			if (phoenixMatch) return `~${phoenixMatch[1]}`;
		}
	} catch (error) {
		if (process.env.DEBUG || process.env.VERBOSE) console.log(import_picocolors.default.dim(`Could not read Phoenix version: ${error instanceof Error ? error.message : String(error)}`));
	}
	return "unknown";
}
/**
* The version of the Phoenix Vite plugin being run.
*/
function pluginVersion() {
	try {
		const currentDir = path.dirname(new URL(import.meta.url).pathname);
		const possiblePaths = [
			path.join(currentDir, "package.json"),
			path.join(currentDir, "../package.json"),
			path.join(currentDir, "../../package.json")
		];
		for (const packageJsonPath of possiblePaths) if (fs.existsSync(packageJsonPath)) return JSON.parse(fs.readFileSync(packageJsonPath).toString()).version || "unknown";
	} catch {}
	return "unknown";
}
function normalizeAliasEntries(aliases) {
	if (!aliases) return [];
	if (Array.isArray(aliases)) return aliases;
	return Object.entries(aliases).map(([find, replacement]) => ({
		find,
		replacement
	}));
}
function mergeServerFsAllow(existingFs, localAllow, rootDirectory) {
	const defaultAllow = [searchForWorkspaceRoot(rootDirectory), rootDirectory];
	if (localAllow.length === 0 && !existingFs?.allow) return existingFs;
	const existingAllow = Array.isArray(existingFs?.allow) ? existingFs.allow : [];
	return {
		...existingFs && typeof existingFs === "object" ? existingFs : {},
		allow: [.../* @__PURE__ */ new Set([
			...defaultAllow,
			...existingAllow,
			...localAllow
		])]
	};
}
function resolveLocalPathDependencySupport(rootDirectory) {
	const packageJsonPath = path.join(rootDirectory, "package.json");
	if (!fs.existsSync(packageJsonPath)) return {
		aliases: [],
		fsAllow: [],
		dedupe: [],
		optimizeDepsExclude: []
	};
	try {
		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
		const allDependencies = {
			...packageJson.dependencies,
			...packageJson.devDependencies
		};
		const aliases = [];
		const fsAllow = /* @__PURE__ */ new Set();
		const dedupe = /* @__PURE__ */ new Set();
		const optimizeDepsExclude = /* @__PURE__ */ new Set();
		for (const [packageName, spec] of Object.entries(allDependencies)) {
			const localDependencyPath = resolveLocalDependencyPath(rootDirectory, spec);
			if (!localDependencyPath) continue;
			const dependencyRoot = fs.realpathSync(localDependencyPath);
			const dependencyPackageJsonPath = path.join(dependencyRoot, "package.json");
			if (!fs.existsSync(dependencyPackageJsonPath)) continue;
			const dependencyPackageJson = JSON.parse(fs.readFileSync(dependencyPackageJsonPath, "utf-8"));
			const resolvedAliases = resolveLocalDependencyAliases(packageName, dependencyRoot, dependencyPackageJson);
			if (resolvedAliases.length === 0) continue;
			fsAllow.add(dependencyRoot);
			for (const peerDependency of Object.keys(dependencyPackageJson.peerDependencies || {})) dedupe.add(peerDependency);
			for (const alias of resolvedAliases) {
				aliases.push({
					find: new RegExp(`^${escapeForRegExp(alias.find)}$`),
					replacement: alias.replacement
				});
				optimizeDepsExclude.add(alias.find);
			}
		}
		return {
			aliases,
			fsAllow: [...fsAllow],
			dedupe: [...dedupe],
			optimizeDepsExclude: [...optimizeDepsExclude]
		};
	} catch {
		return {
			aliases: [],
			fsAllow: [],
			dedupe: [],
			optimizeDepsExclude: []
		};
	}
}
function resolveLocalDependencyPath(rootDirectory, spec) {
	let normalizedSpec = spec;
	if (normalizedSpec.startsWith("file:")) normalizedSpec = normalizedSpec.slice(5);
	else if (normalizedSpec.startsWith("link:")) normalizedSpec = normalizedSpec.slice(5);
	else if (!normalizedSpec.startsWith("./") && !normalizedSpec.startsWith("../") && !path.isAbsolute(normalizedSpec)) return null;
	return path.resolve(rootDirectory, normalizedSpec);
}
function resolveLocalDependencyAliases(packageName, dependencyRoot, dependencyPackageJson) {
	const aliases = [];
	const seen = /* @__PURE__ */ new Set();
	const pushAlias = (find, target) => {
		if (!target || seen.has(find) || target.includes("*")) return;
		aliases.push({
			find,
			replacement: path.resolve(dependencyRoot, target)
		});
		seen.add(find);
	};
	const exportsField = dependencyPackageJson.exports;
	if (typeof exportsField === "string") pushAlias(packageName, exportsField);
	else if (exportsField && typeof exportsField === "object") {
		pushAlias(packageName, resolveExportTarget(exportsField));
		for (const [exportPath, exportValue] of Object.entries(exportsField)) {
			if (!exportPath.startsWith(".") || exportPath.includes("*")) continue;
			const target = resolveExportTarget(exportValue);
			pushAlias(exportPath === "." ? packageName : `${packageName}/${exportPath.slice(2)}`, target);
		}
	}
	if (aliases.length === 0) pushAlias(packageName, dependencyPackageJson.module || dependencyPackageJson.main || null);
	return aliases;
}
function resolveExportTarget(exportValue) {
	if (typeof exportValue === "string") return exportValue;
	if (!exportValue || typeof exportValue !== "object" || Array.isArray(exportValue)) return null;
	const conditions = exportValue;
	if (typeof conditions.import === "string") return conditions.import;
	if (typeof conditions.default === "string") return conditions.default;
	if (typeof conditions.module === "string") return conditions.module;
	return null;
}
function escapeForRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function resolveFullReloadConfig({ refresh: config }) {
	if (typeof config === "boolean") return [];
	if (typeof config === "string") config = [{ paths: [config] }];
	if (!Array.isArray(config)) config = [config];
	if (config.some((c) => typeof c === "string")) config = [{ paths: config }];
	return config.flatMap((c) => {
		const plugin = src_default(c.paths, c.config);
		/** @ts-ignore */
		plugin.__phoenix_plugin_config = c;
		return plugin;
	});
}
/**
* Resolve the server config from the environment.
*/
function resolveEnvironmentServerConfig(env) {
	if (!env.VITE_DEV_SERVER_KEY && !env.VITE_DEV_SERVER_CERT) return;
	if (!env.VITE_DEV_SERVER_KEY || !env.VITE_DEV_SERVER_CERT) throw new Error(`Phoenix Vite Plugin: Both VITE_DEV_SERVER_KEY and VITE_DEV_SERVER_CERT must be provided. Currently provided: KEY=${env.VITE_DEV_SERVER_KEY ? "✓" : "✗"}, CERT=${env.VITE_DEV_SERVER_CERT ? "✓" : "✗"}`);
	const missingFiles = [];
	if (!fs.existsSync(env.VITE_DEV_SERVER_KEY)) missingFiles.push(`Key file not found: ${env.VITE_DEV_SERVER_KEY}`);
	if (!fs.existsSync(env.VITE_DEV_SERVER_CERT)) missingFiles.push(`Certificate file not found: ${env.VITE_DEV_SERVER_CERT}`);
	if (missingFiles.length > 0) throw new Error(`Phoenix Vite Plugin: Unable to find the certificate files specified in your environment.\n` + missingFiles.join("\n") + "\nPlease ensure the paths are correct and the files exist.");
	const host = resolveHostFromEnv(env);
	if (!host) throw new Error(`Phoenix Vite Plugin: Unable to determine the host from the environment.\nPHX_HOST is set to: ${env.PHX_HOST ? `"${env.PHX_HOST}"` : "(not set)"}\nPlease set PHX_HOST to a valid hostname or URL (e.g., "localhost", "myapp.test", or "https://myapp.test").`);
	return {
		hmr: { host },
		host,
		https: {
			key: fs.readFileSync(env.VITE_DEV_SERVER_KEY),
			cert: fs.readFileSync(env.VITE_DEV_SERVER_CERT)
		}
	};
}
/**
* Resolve the host name from the environment.
*/
function resolveHostFromEnv(env) {
	if (env.PHX_HOST) try {
		if (env.PHX_HOST.startsWith("http://") || env.PHX_HOST.startsWith("https://")) return new URL(env.PHX_HOST).host;
		return env.PHX_HOST;
	} catch {
		return;
	}
}
/**
* Resolve the dev server URL from the server address and configuration.
*/
function resolveDevServerUrl(address, config, userConfig) {
	const configHmrProtocol = typeof config.server.hmr === "object" ? config.server.hmr.protocol : null;
	const clientProtocol = configHmrProtocol ? configHmrProtocol === "wss" ? "https" : "http" : null;
	const serverProtocol = config.server.https ? "https" : "http";
	const protocol = clientProtocol ?? serverProtocol;
	const configHmrHost = typeof config.server.hmr === "object" ? config.server.hmr.host : null;
	const configHost = typeof config.server.host === "string" ? config.server.host : null;
	const dockerHost = process.env.PHOENIX_DOCKER && !userConfig.server?.host ? "localhost" : null;
	const serverAddress = isIpv6(address) ? `[${address.address}]` : address.address;
	return `${protocol}://${configHmrHost ?? dockerHost ?? configHost ?? serverAddress}:${(typeof config.server.hmr === "object" ? config.server.hmr.clientPort : null) ?? address.port}`;
}
function isIpv6(address) {
	return address.family === "IPv6" || address.family === 6;
}
/**
* Resolve the Vite base option from the configuration.
*/
function resolveBase(config, assetUrl) {
	return "/" + assetUrl + "/";
}
/**
* Resolve the Vite input path from the configuration.
*/
function resolveInput(config, ssr) {
	if (ssr) return config.ssr;
	if (Array.isArray(config.input)) return config.input.map((entry) => path.resolve(process.cwd(), entry));
	if (typeof config.input === "string") return path.resolve(process.cwd(), config.input);
	return config.input;
}
/**
* Resolve the Vite outDir path from the configuration.
*/
function resolveOutDir(config, ssr) {
	if (ssr) return config.ssrOutputDirectory;
	return path.join(config.publicDirectory, config.buildDirectory);
}
/**
* Add the Inertia helpers to the list of SSR dependencies that aren't externalized.
*
* @see https://vitejs.dev/guide/ssr.html#ssr-externals
*/
function noExternalInertiaHelpers(config) {
	const userNoExternal = config.ssr?.noExternal;
	const pluginNoExternal = ["phoenix-vite-plugin"];
	if (userNoExternal === true) return true;
	if (typeof userNoExternal === "undefined") return pluginNoExternal;
	return [...Array.isArray(userNoExternal) ? userNoExternal : [userNoExternal], ...pluginNoExternal];
}
/**
* Resolve the server config for local development environments with TLS support.
* This function attempts to detect and use certificates from local development tools.
*/
function resolveDevelopmentEnvironmentServerConfig(detectTls, env) {
	if (detectTls === false) return;
	const phxHost = env.PHX_HOST;
	if (!phxHost && detectTls === null) return;
	const resolvedHost = detectTls === true || detectTls === null ? phxHost || "localhost" : detectTls;
	const homeDir = os.homedir();
	const searchPaths = [];
	const possibleCertPaths = [
		{
			key: path.join(homeDir, ".local/share/mkcert", `${resolvedHost}-key.pem`),
			cert: path.join(homeDir, ".local/share/mkcert", `${resolvedHost}.pem`),
			name: "mkcert"
		},
		{
			key: path.join(homeDir, "Library/Application Support/mkcert", `${resolvedHost}-key.pem`),
			cert: path.join(homeDir, "Library/Application Support/mkcert", `${resolvedHost}.pem`),
			name: "mkcert (macOS)"
		},
		{
			key: path.join(homeDir, ".local/share/caddy/certificates/local", `${resolvedHost}`, `${resolvedHost}.key`),
			cert: path.join(homeDir, ".local/share/caddy/certificates/local", `${resolvedHost}`, `${resolvedHost}.crt`),
			name: "Caddy"
		},
		{
			key: path.join(process.cwd(), "priv/cert", `${resolvedHost}-key.pem`),
			cert: path.join(process.cwd(), "priv/cert", `${resolvedHost}.pem`),
			name: "project (priv/cert)"
		},
		{
			key: path.join(process.cwd(), "priv/cert", `${resolvedHost}.key`),
			cert: path.join(process.cwd(), "priv/cert", `${resolvedHost}.crt`),
			name: "project (priv/cert)"
		},
		{
			key: path.join(process.cwd(), "certs", `${resolvedHost}-key.pem`),
			cert: path.join(process.cwd(), "certs", `${resolvedHost}.pem`),
			name: "project (certs/)"
		},
		{
			key: path.join(process.cwd(), "certs", `${resolvedHost}.key`),
			cert: path.join(process.cwd(), "certs", `${resolvedHost}.crt`),
			name: "project (certs/)"
		}
	];
	for (const certPath of possibleCertPaths) {
		searchPaths.push(`${certPath.name}: ${path.dirname(certPath.cert)}`);
		if (fs.existsSync(certPath.key) && fs.existsSync(certPath.cert)) {
			if (process.env.DEBUG || process.env.VERBOSE) console.log(import_picocolors.default.dim(`Found TLS certificates in ${certPath.name} location`));
			return {
				hmr: { host: resolvedHost },
				host: resolvedHost,
				https: {
					key: certPath.key,
					cert: certPath.cert
				}
			};
		}
	}
	if (detectTls !== null) {
		const uniquePaths = [...new Set(searchPaths)];
		console.warn(`
[nb-vite] ${import_picocolors.default.yellow("Warning")}: Unable to find TLS certificate files for host "${resolvedHost}".\n\nSearched in the following locations:\n` + uniquePaths.map((p) => `  - ${p}`).join("\n") + `

To generate local certificates, you can use mkcert:
  ${import_picocolors.default.dim("$")} brew install mkcert  ${import_picocolors.default.dim("# Install mkcert (macOS)")}\n  ${import_picocolors.default.dim("$")} mkcert -install        ${import_picocolors.default.dim("# Install local CA")}\n  ${import_picocolors.default.dim("$")} mkcert ${resolvedHost}  ${import_picocolors.default.dim("# Generate certificate")}\n  ${import_picocolors.default.dim("$")} mkdir -p priv/cert     ${import_picocolors.default.dim("# Create cert directory")}\n  ${import_picocolors.default.dim("$")} mv ${resolvedHost}*.pem priv/cert/  ${import_picocolors.default.dim("# Move certificates")}\n\nOr set detectTls: false in your vite.config.js to disable TLS detection.\n`);
	}
}
/**
* Resolve aliases for Phoenix colocated hooks.
*
* In Phoenix 1.8, LiveView hooks can be colocated with their components.
* These are placed in the build directory under lib/{app_name}/priv/phoenix-colocated.
* This function detects the app name and creates the necessary alias.
*
* @returns Record of colocated aliases
*/
function resolvePhoenixColocatedAliases() {
	const aliases = {};
	const appName = getPhoenixAppName();
	if (!appName) return aliases;
	const projectRoot = findPhoenixProjectRoot();
	const mixEnv = process.env.MIX_ENV || "dev";
	const defaultBuildPath = projectRoot ? path.join(projectRoot, "_build", mixEnv) : path.resolve(process.cwd(), `../_build/${mixEnv}`);
	const buildPath = process.env.PHX_BUILD_PATH ? path.resolve(process.env.PHX_BUILD_PATH) : defaultBuildPath;
	const colocatedPath = path.resolve(buildPath, `phoenix-colocated/${appName}`);
	aliases[`phoenix-colocated/${appName}`] = colocatedPath;
	if (process.env.DEBUG || process.env.VERBOSE) console.log(import_picocolors.default.dim(`Phoenix colocated alias: phoenix-colocated/${appName} -> ${colocatedPath}`));
	return aliases;
}
/**
* Find the Phoenix project containing the current frontend directory.
*/
function findPhoenixProjectRoot(startDirectory = process.cwd()) {
	let directory = path.resolve(startDirectory);
	while (true) {
		if (fs.existsSync(path.join(directory, "mix.exs"))) return directory;
		const parent = path.dirname(directory);
		if (parent === directory) return;
		directory = parent;
	}
}
/**
* Get the Phoenix app name from the watcher environment or mix.exs.
*/
function getPhoenixAppName() {
	if (process.env.PHX_APP_NAME) return process.env.PHX_APP_NAME;
	const projectRoot = findPhoenixProjectRoot();
	if (!projectRoot) return;
	try {
		return fs.readFileSync(path.join(projectRoot, "mix.exs"), "utf8").match(/\bapp:\s*:([a-zA-Z0-9_]+)/)?.[1];
	} catch {
		return;
	}
}
/**
* Resolve aliases for Phoenix JavaScript libraries.
*
* This function automatically detects and creates Vite aliases for Phoenix JS dependencies
* that are managed by Mix in the deps directory. This allows importing these libraries
* naturally (e.g., `import { Socket } from "phoenix"`) without needing to know their
* actual file system location.
*
* For package managers that don't support workspaces with non-standard structures
* (npm, pnpm, yarn), this provides a clean way to resolve Phoenix dependencies.
*
* @returns Record of library names to their resolved file paths
*/
function resolvePhoenixJSAliases() {
	const aliases = {};
	const depsPath = path.resolve(process.cwd(), "../deps");
	const phoenixLibraries = [
		{
			name: "phoenix",
			paths: ["phoenix/priv/static/phoenix.mjs", "phoenix/priv/static/phoenix.js"]
		},
		{
			name: "phoenix_html",
			paths: ["phoenix_html/priv/static/phoenix_html.js"]
		},
		{
			name: "phoenix_live_view",
			paths: ["phoenix_live_view/priv/static/phoenix_live_view.esm.js", "phoenix_live_view/priv/static/phoenix_live_view.js"]
		}
	];
	for (const library of phoenixLibraries) for (const libPath of library.paths) {
		const fullPath = path.join(depsPath, libPath);
		if (fs.existsSync(fullPath)) {
			aliases[library.name] = fullPath;
			if (process.env.DEBUG || process.env.VERBOSE) {
				const isESM = libPath.includes(".mjs") || libPath.includes(".esm.");
				console.log(import_picocolors.default.dim(`Phoenix alias: ${library.name} -> ${libPath} ${isESM ? "(ESM)" : "(CommonJS)"}`));
			}
			break;
		}
	}
	if (process.env.DEBUG || process.env.VERBOSE) {
		const missingLibraries = phoenixLibraries.filter((lib) => !aliases[lib.name]).map((lib) => lib.name);
		if (missingLibraries.length > 0) console.log(import_picocolors.default.dim(`Missing Phoenix JS libraries: ${missingLibraries.join(", ")}. Make sure to run 'mix deps.get' in your Phoenix project.`));
	}
	return aliases;
}
//#endregion
export { phoenix as default, phoenix, nbRoutes, refreshPaths };
