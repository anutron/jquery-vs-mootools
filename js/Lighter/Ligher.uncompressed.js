/**
 * Script:
 *   Lighter.js - Syntax Highlighter written in MooTools.
 *
 * License:
 *   MIT-style license.
 * 
 * Author:
 *   Jose Prado
 *
 * Copyright:
 *   Copyright (©) 2009 [Jose Prado](http://pradador.com/).
 *
 * Changelog:
 * 2009/03/21 (1.0.0)
 *   - Initial Release
 * 
 */
var Lighter = new Class(
{	
	Implements: [Options],
	name: 'Lighter',
	options: {
		altLines: '', // Pseudo-selector enabled.
		container: null,
		editable: false,
		flame: 'standard',
		fuel:  'standard',
		id: null,
		indent: -1,
		jsStyles: true,
		matchType: "standard",
		mode: "pre",
		path: "./",
		strict: false
	},
	
	/***************************
	 * Lighter Initialization
	 **************************/
	initialize: function(codeblock, options) {
		this.setOptions(options);
		options        = this.options;
		this.id        = options.id || this.name + '_' + $time();
		this.codeblock = $(codeblock)
		this.code = codeblock.get('html').chop().replace(/&lt;/gim, '<').replace(/&gt;/gim, '>').replace(/&amp;/gim, '&');
		this.container = $(this.options.container);
		
		// Indent code if user option is set.
		if (options.indent > -1) this.code = this.code.tabToSpaces(options.indent);
		
		// Set builder options.
		this.builder = new Hash({
			'pre':    this.createLighter.bind(this),
			'ol':     this.createLighterWithLines.pass([['ol'], ['li']], this),
			'div':    this.createLighterWithLines.pass([['div'], ['div', 'span'], true, 'span'], this),
			'table':  this.createLighterWithLines.pass([['table', 'tbody'], ['tr', 'td'], true, 'td'], this)
		});
		
		// Extract fuel/flame names. Precedence: className > options > 'standard'.
		var ff = this.codeblock.get('class').split(':');
		if (!ff[0]) ff[0] = this.options.fuel;
		if (!ff[1]) ff[1] = this.options.flame;
		
		// Load flame to start chain of loads.
		this.loadFlameSrc(ff);
	},
	/* Try to insert script into document. If successful or script is already included, 
	   call loadFlame(). Otherwise, revert to standard flame and call loadFlame(). */
	loadFlameSrc: function(ff) {
		if (!$chk(Flame[ff[1]])) {
			var flameScript = new Element('script', {
				src: this.options.path+'Flame.'+ff[1]+'.js',
				type: 'text/javascript'
			}).addEvents({
				load: function() {
					this.loadFlame(ff);
				}.bind(this),
				error: function() {
					ff[1] = 'standard';
					this.loadFlame(ff)
				}.bind(this)
			}).inject(document.head);
		} else {
			this.loadFlame(ff);
		}
	},
	loadFlame: function(ff) {
		this.flame = new Flame[ff[1]](this);
		this.loadFuelSrc(ff);
	},
	/* Same as loadFlameSrc */
	loadFuelSrc: function(ff) {
		if (!$chk(Fuel[ff[0]])) {
			var fuelScript = new Element('script', {
				src: this.options.path+'Fuel.'+ff[0]+'.js',
				type: 'text/javascript'
			}).addEvents({
				load: function() {
	    		this.loadFuel(ff);
				}.bind(this),
				error: function() {
					ff[0] = 'standard';
					this.loadFuel(ff);
				}.bind(this)
			}).inject(document.head);
		} else {
			this.loadFuel(ff);
		}
	},
	loadFuel: function(ff) {
		this.fuel = new Fuel[ff[0]](this, this.flame, {
			matchType: this.options.matchType,
			strict: this.options.strict
		});
		this.light();
	},
	light: function() {
		// Build highlighted code object.
		this.element = this.toElement();
		
		// Insert lighter in the right spot.
		if (this.container) {
			this.container.empty();
			this.element.inject(this.container);
		} else {
			this.codeblock.setStyle('display', 'none');
			this.element.inject(this.codeblock, 'after');
		}
  },
	
	/***************************
	 * Lighter creation methods
	 **************************/
	createLighter: function() {
		var lighter = new Element('pre', {'class': this.flame.shortName + this.name}),
		    pointer = 0;
		    
		// If no matches were found, insert code plain text.
		if (!$defined(this.fuel.wicks[0])) {
			lighter.appendText(this.code);
		} else {
		
			// Step through each match and add unmatched + matched bits to lighter.
			this.fuel.wicks.each(function(match) {
				lighter.appendText(this.code.substring(pointer, match.index));
				
				this.insertAndKeepEl(lighter, match.text, match.type);
				pointer = match.index + match.text.length;
			}, this);
			
			// Add last unmatched code segment if it exists.
			if (pointer < this.code.length) {
				lighter.appendText(this.code.substring(pointer, this.code.length));
			}
		}
		
		//lighter.set('text', lighter.get('html'));
		return lighter;
	},
	createLighterWithLines: function(parent, child, addLines, numType) {
		var lighter = new Element(parent[0], {'class': this.flame.shortName + this.name, 'id': this.id}),
		    newLine = new Element(child[0]),
		    lineNum = 1,
		    pointer = 0,
		    text = null;
		// Small hack to ensure tables have no ugly styles.
		if (parent[0] == "table") lighter.set("cellpadding", 0).set("cellspacing", 0).set("border", 0);
		
		/* If lines need to be wrapped in an inner parent, create that element
		   with this test. (E.g, tbody in a table) */
		if (parent[1]) lighter = new Element(parent[1]).inject(lighter);
		
		/* If code needs to be wrapped in an inner child, create that element
		   with this test. (E.g, tr to contain td) */
		if (child[1])  newLine = new Element(child[1]).inject(newLine);
		newLine.addClass(this.flame.shortName + 'line');
		if (addLines) lineNum = this.insertLineNum(newLine, lineNum, numType);

		// Step through each match and add matched/unmatched bits to lighter.
		this.fuel.wicks.each(function(match) {
		
			// Create and insert un-matched source code bits.
			if (pointer != match.index) {
				text = this.code.substring(pointer, match.index).split('\n');
				for (var i = 0; i < text.length; i++) {
					if (i < text.length - 1) {
						if (text[i] == '') text[i] = ' ';
						newLine = this.insertAndMakeEl(newLine, lighter, text[i], child);
						if (addLines) lineNum = this.insertLineNum(newLine, lineNum, numType);
					} else {
						this.insertAndKeepEl(newLine, text[i]);
					}
				}
			}
			
			// Create and insert matched symbol.
			text = match.text.split('\n');
			for (i = 0; i < text.length; i++) {
				if (i < text.length - 1) {
					newLine = this.insertAndMakeEl(newLine, lighter, text[i], child, match.type);
					if (addLines) lineNum = this.insertLineNum(newLine, lineNum, numType);
				} else {
					this.insertAndKeepEl(newLine, text[i], match.type);
				}
			}
			
			pointer = match.end;
		}, this);
		
		// Add last unmatched code segment if it exists.
		if (pointer <= this.code.length) {
			text = this.code.substring(pointer, this.code.length).split('\n');
			for (var i = 0; i < text.length; i++) {
				newLine = this.insertAndMakeEl(newLine, lighter, text[i], child);
				if (addLines) lineNum = this.insertLineNum(newLine, lineNum, numType);
			}
		}
		
		// Add alternate line styles based on pseudo-selector.
		if (this.options.altLines !== '') {
			if (this.options.altLines == 'hover') {
				lighter.getElements('.'+this.flame.shortName+'line').addEvents({
						'mouseover': function() {this.toggleClass('alt');},
						'mouseout':  function() {this.toggleClass('alt');}
				});
			} else {
				if (child[1]) {
					lighter.getChildren(':'+this.options.altLines).getElement('.'+this.flame.shortName+'line').addClass('alt');
				} else {
					lighter.getChildren(':'+this.options.altLines).addClass('alt');
				}
			}
		}
		
		// Add first/last line classes to correct element based on mode.
		if (child[1]) {
			lighter.getFirst().getChildren().addClass(this.flame.shortName+'first');
			lighter.getLast().getChildren().addClass(this.flame.shortName+'last');
		} else {
			lighter.getFirst().addClass(this.flame.shortName+'first');
			lighter.getLast().addClass(this.flame.shortName+'last');
		}
		
		// Ensure we return the real parent, not just an inner element like a tbody.
		if (parent[1]) lighter = lighter.getParent();
		return lighter;
	},
	/** Helper function to insert new code segment into existing line. */
	insertAndKeepEl: function(el, text, alias) {
		if (text.length > 0) {
			var span = new Element('span');
			span.set('text', text);
			if (alias) {span.addClass(this.flame.aliases[alias]);}
			span.inject(el);
		}
	},
	/** Helper function to insert new code segment into existing line and create new line. */
	insertAndMakeEl: function(el, group, text, child, alias) {
		this.insertAndKeepEl(el, text, alias);
		if (child[1]) el = el.getParent();
		el.inject(group);
		
		var newLine = new Element(child[0]);
		if (child[1]) newLine = new Element(child[1]).inject(newLine);
		newLine.addClass(this.flame.shortName+'line');
		return newLine;
	},
	/** Helper funciton to insert line number into line. */
	insertLineNum: function(el, lineNum, elType) {
		var newNum = new Element(elType, {
			'text':  lineNum++,
			'class': this.flame.shortName+ 'num'
		});
		newNum.inject(el.getParent(), 'top');
		
		return lineNum;
	},
	
	/******************
	 * Element Methods
	 ******************/
	toElement: function() {
		if (!this.element) {
			this.element = this.builder[this.options.mode]();
			if (this.options.editable) {this.element.set('contenteditable', 'true');}
		}
		
		return this.element;
	},
	replaces: function(element){
    element = $(element, true);
    element.parentNode.replaceChild(this.toElement(), element);
    
    return this;
  }

});

/** Element Native extensions */
Element.implement({light: function(options){return new Lighter(this, options);}});

/** String Native extensions */
String.implement({
	chop: function() {return this.replace(/(^\s*\n|\n\s*$)/gi, '');},
	tabToSpaces: function(spaces) {
		for (var i = 0, indent = ''; i < spaces; i++) {indent += ' ';}
		return this.replace(/\t/g, indent);
	}
});

/**
 * Script:
 *   Fuel.js - Language definition engine for Lighter.js
 *
 * License:
 *   MIT-style license.
 * 
 * Author:
 *   Jose Prado
 *
 * Copyright:
 *   Copyright (©) 2009 [Jose Prado](http://pradador.com/).
 *
 * Changelog:
 * 2009/03/21 (1.0.0)
 *   - Initial Release
 * 
 */
var Fuel = new Class({
	
	Implements: [Options],
	options: {
		matchType: "standard",
		strict: false
	},
	language: '',
	defaultFlame: 'standard',
	
	patterns: new Hash(),
	keywords: new Hash(),
	rules:    new Hash(),
	delimiters: new Hash({
		start: null,
		end: null
	}),

	/************************
	 * Common Regex Rules
	 ***********************/
	common: {	
		slashComments: /(?:^|[^\\])\/\/.*$/gm, // Matches a C style single-line comment.
		poundComments: /#.*$/gm,               // Matches a Perl style single-line comment.
		multiComments: /\/\*[\s\S]*?\*\//gm,   // Matches a C style multi-line comment.
		aposStrings:   /'[^'\\]*(?:\\.[^'\\]*)*'/gm, // Matches a string enclosed by single quotes.
		quotedStrings: /"[^"\\]*(?:\\.[^"\\]*)*"/gm, // Matches a string enclosed by double quotes.
		strings:       /'[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*"/gm, // Matches both.
		properties:    /\.([\w]+)\s*/gi,     // Matches a property: .property style.
		methodCalls:   /\.([\w]+)\s*\(/gm,   // Matches a method call: .methodName() style.
		functionCalls: /\b([\w]+)\s*\(/gm,   // Matches a function call: functionName() style.
		brackets:      /\{|\}|\(|\)|\[|\]/g, // Matches any of the common brackets.
		numbers:       /\b((?:(\d+)?\.)?[0-9]+|0x[0-9A-F]+)\b/gi // Matches integers, decimals, hexadecimals.
	},
	
	/************************
	 * Fuel Constructor
	 ***********************/
	initialize: function(lighter, flame, options, wicks) {
		this.setOptions(options);
		this.wicks = wicks || [];
		
		// Set Lighter/Fuel/Flame relationship.
		this.lighter = lighter;
		this.flame   = flame;
		
		// Set builder object for matchType.
		this.builder = new Hash({
			'standard': this.findMatches,
			'lazy':     this.findMatchesLazy
		});
		
		// Add delimiter rules if not in strict mode
		if (!options.strict) {
			if (this.delimiters.start) this.addFuel('delimBeg', this.delimiters.start, 'de1');
			if (this.delimiters.end)   this.addFuel('delimEnd', this.delimiters.end,   'de2');
		}
		
		// Set Keyword Rules from this.keywords object.
		this.keywords.each(function(keywordSet, ruleName) {
			if (keywordSet.csv != '') {
				this.addFuel(ruleName, this.csvToRegExp(keywordSet.csv, "g"), keywordSet.alias);
			}
		}, this);
		
		// Set Rules from this.patterns object.
		this.patterns.each(function(regex, ruleName) {
			this.addFuel(ruleName, regex.pattern, regex.alias);
		}, this);
		
		/** Process source code based on match type. */
		var codeBeg = 0,
		    codeEnd = lighter.code.length,
		    codeSeg = '',
		    delim   = this.delimiters,
		    matches = [],
		    match   = null,
		    endMatch = null;
		
		if (!options.strict) {
			// Find matches through the complete source code.
			matches.extend(this.builder[options.matchType].pass(lighter.code, this)());
		} else if (delim.start && delim.end) {
			// Find areas between language delimiters and find matches there.
			while ((match = delim.start.exec(lighter.code)) != null ) {
				delim.end.lastIndex = delim.start.lastIndex;
				if ((endMatch = delim.end.exec(lighter.code)) != null ) {
					matches.push(new Wick(match[0], 'de1', match.index));
					codeBeg = delim.start.lastIndex;
					codeEnd = endMatch.index-1;
					codeSeg = lighter.code.substring(codeBeg, codeEnd);
					matches.extend(this.builder[options.matchType].pass([codeSeg, codeBeg], this)());
					matches.push(new Wick(endMatch[0], 'de2', endMatch.index));
				}
			}
		}
		this.wicks = matches;
	},
	
	/************************
	 * Regex Helper methods.
	 ***********************/
	addFuel: function(fuelName, RegEx, className) {
		this.rules[fuelName] = RegEx;
		this.flame.addAlias(fuelName, className);
	},
	csvToRegExp: function(csv, mod) {return new RegExp('\\b(' + csv.replace(/,\s*/g, '|') + ')\\b', mod);},
	delimToRegExp: function(beg, esc, end, mod, suffix) {
		beg = beg.escapeRegExp();
		if (esc) esc = esc.escapeRegExp();
		end = (end) ? end.escapeRegExp() : beg;
		pat = (esc) ? beg+"[^"+end+esc+'\\n]*(?:'+esc+'.[^'+end+esc+'\\n]*)*'+end : beg+"[^"+end+'\\n]*'+end;
		return new RegExp(pat+(suffix || ''), mod || '');
	},
	strictRegExp: function() {
		var regex = '(';
		for (var i = 0; i < arguments.length; i++) {
			regex += arguments[i].escapeRegExp();
			regex += (i < arguments.length - 1) ? '|' : '';
		}
		regex += ')';
		return new RegExp(regex, "gim");
	},
	
	/************************
	 * Match finding Methods
	 ***********************/
	findMatches: function(code, offset) {
		var wicks       = [],
		    startIndex  = 0,
		    matchIndex  = code.length
		    insertIndex = 0,
		    match      = null,
		    type       = null,
		    newWick    = null,
		    rule       = null,
		    rules      = {},
		    currentMatch = null,
		    futureMatch  = null;
		
		offset = offset || 0;
		
		// Create assosciative array of rules for faster access via for...in loop instead of .each().
		this.rules.each(function(regex, rule) {
			rules[rule] = {pattern: regex, lastIndex: 0};
		}, this);
			
		/**
		 * Step through the source code sequentially finding the left-most/earliest matches and then
		 * continuing beyond the end of that match to prevent parser from adding inner matches.
		 */
		while(startIndex < code.length) {
			matchIndex = code.length;
			match      = null;
			
			// Apply each rule at the current startIndex.
			for (rule in rules) {
				rules[rule].pattern.lastIndex = startIndex;
				currentMatch = rules[rule].pattern.exec(code);
				if (currentMatch === null) {
					// Delete rule if there's no matches.
					delete rules[rule];
				} else {
					// Find earliest and longest match, then store relevant info.
					if (currentMatch.index < matchIndex || (currentMatch.index == matchIndex && match[0].length < currentMatch[0].length)) {
			      match      = currentMatch;
			      type       = rule;
			      matchIndex = currentMatch.index;
			    }
					// Store index of rules' next match in nextIndex property.
			    rules[rule].nextIndex = rules[rule].pattern.lastIndex - currentMatch[0].length;
			  }
			}
			/* Create a new Wick out of found match. Otherwise break out of loop since no
			   matches are left. */
			if (match != null) {
			
				// If $1 capture group exists, use $1 instead of full match.
				index = (match[1] && match[0].contains(match[1])) ? match.index + match[0].indexOf(match[1]) : match.index;
				newWick = new Wick(match[1] || match[0], type, index+offset);
				wicks.push(newWick);
				
				/* Find the next match of current rule and store its index. If not done, the nextIndex
				   would be at the start of current match, thus creating an infinite loop*/
				futureMatch = rules[type].pattern.exec(code);
	      if (!futureMatch) {
	      	rules[type].nextIndex = code.length;
	      } else {
	      	rules[type].nextIndex = rules[type].pattern.lastIndex - futureMatch[0].length;
	      }
				
				// Cycle through "nextIndex" properties and store earliest position in min variable.
				var min = code.length;
				for (rule in rules) {
					if (rules[rule].nextIndex < min) {
						min = rules[rule].nextIndex;
					}
				}
				/* Set startIndex to the end of current match if min is located behind it. Normally this
				   would signal an inner match. Future upgrades should do this test in the min loop
				   in order to find the actual earliest match. */
				startIndex = Math.max(min, newWick.end - offset);
			} else {
				break;
			}
		}
		return wicks;
	},
	/* Brute force the matches by finding all possible matches from all rules. Then we sort them
	   and cycle through the matches finding and eliminating inner matches. Faster than findMatches,
	   but less robust and prone to erroneous matches. */
	findMatchesLazy: function(code, offset) {
		var wicks = this.wicks,
		    match = null
		    index = 0;
		
		offset = offset || 0;
		
		this.rules.each(function(regex, rule) {
			while ((match = regex.exec(code)) != null) {
				index = (match[1] && match[0].contains(match[1])) ? match.index + match[0].indexOf(match[1]) : match.index;
				wicks.push(new Wick(match[1] || match[0], rule, index + offset));
			}
		}, this);
		return this.purgeWicks(wicks);
	},
	purgeWicks: function(wicks) {
		wicks = wicks.sort(this.compareWicks);
		for (var i = 0, j = 0; i < wicks.length; i++) {
			if (wicks[i] == null) continue;
			for (j = i+1; j < wicks.length && wicks[i] != null; j++) {
				if      (wicks[j] == null)            {continue;}
				else if (wicks[j].isBeyond(wicks[i])) {break;}
				else if (wicks[j].overlaps(wicks[i])) {wicks[i] = null;}
				else if (wicks[i].contains(wicks[j])) {wicks[j] = null;}
			}
		}
		return wicks.clean();
	},
	compareWicks: function(wick1, wick2) {return wick1.index - wick2.index;}
});

Fuel.standard = new Class({Extends: Fuel, initialize: function(lighter, flame, options, wicks) {this.parent(lighter, flame, options, wicks);}});

var Wick = new Class({

	initialize: function(match, type, index) {
		this.text   = match;
		this.type   = type;
		this.index  = index;
		this.length = this.text.length;
		this.end    = this.index + this.length;
	},
	contains: function(wick) {return (wick.index >= this.index && wick.index < this.end);},
	isBeyond: function(wick) {return (this.index >= wick.end);},
	overlaps: function(wick) {return (this.index == wick.index && this.length > wick.length);},
	toString: function() {return this.index+' - '+this.text+' - '+this.end;}
});

/**
 * Script:
 *   Flame.js - Theme Engine for Lighter.js
 *
 * License:
 *   MIT-style license.
 * 
 * Author:
 *   Jose Prado
 *
 * Copyright:
 *   Copyright (©) 2009 [Jose Prado](http://pradador.com/).
 *
 * Changelog:
 * 2009/03/21 (1.0.0)
 *   - Initial Release
 *
 */
var Flame = new Class({
	
	shortName: 'lt',
	aliases:   new Hash(),
	common:    new Hash(),
	layout:    new Hash(),
	styles:    new Hash(),
	
	defaultCommon: new Hash({
		'font-family': 'Monaco, Courier, Monospace',
		'font-size': '12px',
		'line-height': '1.5',
		'overflow': 'auto',
		'white-space': 'pre-wrap',
 		'word-wrap': 'break-word'
	}),
	defaultLayout: new Hash({
		'numBgColor':    new Hash(),
		'lineBgColor':   new Hash(),
		'lineNumStyles': new Hash(),
		'lineStyles':    new Hash(),
		'altLineStyles': new Hash(),
		'top':           new Hash(),
		'right':         new Hash(),
		'bottom':        new Hash(),
		'left':          new Hash(),
		'codeStyles':    new Hash()
	}),
	fixes: new Hash({
		'div': new Hash({
			'div':  new Hash({'clear': 'left','overflow': 'auto'}),
			'num':  new Hash({'display': 'block','float': 'left','text-align': 'center','width': '30px'}),
			'line': new Hash({'display': 'block','margin-left': '30px'})
		}),
		'table': new Hash({
			'num': new Hash({'text-align': 'center','width': '30px'})
		}),
		'ol': new Hash({
			'ol': new Hash({'margin-top': '0', 'margin-bottom': '0', 'margin-left': '0','padding-left': '0'}),
			'li': new Hash({'margin-left': '40px'})
		})
	}),
	
	initialize: function(lighter, fuel) {
		// Setup Lighter/Fuel/Flame trio.
		this.lighter  = lighter;
		this.fuel     = fuel;
		
		// Combine basic font/white-space styles.
		this.common.combine(this.defaultCommon);
		this.layout.combine(this.defaultLayout);
		
		// Map general styles to their aliases.
		this.styles.each(function(style, key) {
			this.addAlias(key);
		}, this);
		
		// Insert stylesheet if in jsStyles mode
		if (this.lighter.options.jsStyles) this.injectTag();
	},
	addAlias: function(key, alias) {this.aliases[key] = alias || key;},
	
	injectTag: function() {
		this.styleTag = new Element("style").setProperty('type','text/css').inject(document.head);
		this.styleText = "";
		
		var type    = this.lighter.options.mode,
		    pfx     = type+'.'+this.shortName+this.lighter.name, // div.ltLighter
		    pfx2    = pfx+' .'+this.shortName, // div.ltLighter .lt
		    numCSS  = this.layout['lineNumStyles'].extend(this.layout.numBgColor),
		    lineCSS = this.layout['lineStyles'].extend(this.layout.lineBgColor),
		    padCSS  = this.layout.left.extend(this.layout.right);
		    
		// General white-space/font styles.
		this.addCSS(pfx, this.common);
		this.addCSS(pfx, new Hash({'white-space': '-moz-pre-wrap'}));
		this.addCSS(pfx, new Hash({'white-space': '-pre-wrap'}));
		this.addCSS(pfx, new Hash({'white-space': '-o-pre-wrap'}));
		
		// Case specific styles for a common general style.
		switch (type) {
			case "pre":
				padCSS = padCSS.extend(this.layout.top).extend(this.layout.bottom);
				this.addCSS(pfx, this.layout.lineBgColor.extend(padCSS));
			  this.addCSS(pfx+' span',  this.layout['codeStyles']);
				break;
			case "ol":
				this.addCSS(pfx,          numCSS.extend(this.fixes['ol']['ol']));
				this.addCSS(pfx+' li',    lineCSS.extend(padCSS).extend(this.fixes['ol']['li']));
				this.addCSS(pfx2+'first', this.layout['top']);
				this.addCSS(pfx2+'last',  this.layout['bottom']);
				this.addCSS(pfx+' .alt',  this.layout['altLineStyles']);
			  this.addCSS(pfx+' span',  this.layout['codeStyles']);
			  break;
			case "div":
				this.addCSS(pfx2+'num',   numCSS.extend(this.fixes.div.num));
				this.addCSS(pfx2+'line',  lineCSS.extend(padCSS).extend(this.fixes.div.line));
				this.addCSS(pfx+' div',   this.fixes['div']['div'].extend(this.layout.numBgColor));
				this.addCSS(pfx2+'first', this.layout['top']);
				this.addCSS(pfx2+'last',  this.layout['bottom']);
				this.addCSS(pfx+' .alt',  this.layout['altLineStyles']);
			  this.addCSS(pfx+' span',  this.layout['codeStyles']);
			  break;
			case "table":
				this.addCSS(pfx2+'num',   numCSS.extend(this.fixes['table']['num']));
				this.addCSS(pfx2+'line',  lineCSS.extend(padCSS));
				this.addCSS(pfx2+'first', this.layout['top']);
				this.addCSS(pfx2+'last',  this.layout['bottom']);
				this.addCSS(pfx+' .alt',  this.layout['altLineStyles']);
			  this.addCSS(pfx+' span',  this.layout['codeStyles']);
			  break;
		}
		
		this.styles.each(function(stylesHash, styleName) {this.addCSS(pfx+' .'+styleName, stylesHash);}, this);
		
		if (Browser.Engine.trident) {
			this.styleTag.styleSheet.cssText += this.styleText;
		} else {
			this.styleTag.appendText(this.styleText);
		}
	},
	/** Inspiration from horseweapon @ http://forum.mootools.net/viewtopic.php?id=6635 */
	addCSS: function(styleName, stylesHash) {
		var newStyle = "\n" + styleName + " {\n";
		if (stylesHash) {
			stylesHash.each(function(value, attribute) {newStyle += "\t" + attribute + ": " + value + ";\n";});
		}
		newStyle += "}\n";
		this.styleText += newStyle;
	}
	
});

Flame.standard = new Class({

	Extends: Flame,
	styles: new Hash({
		de1: new Hash({}), // Beginning delimiter
		de2: new Hash({}), // End delimiter
		kw1: new Hash({'color': '#1b609a'}), // Keywords 1
		kw2: new Hash({'color': '#9a6f1b'}), // Keywords 2
		kw3: new Hash({'color': '#784e0c'}), // Keywords 3
		kw4: new Hash({'color': '#9a6f1b'}), // Keywords 4
		co1: new Hash({'color': '#888888'}), // Comments 1
		co2: new Hash({'color': '#888888'}), // Comments 2
		st0: new Hash({'color': '#489a1b'}), // Strings 1
		st1: new Hash({'color': '#489a1b'}), // Strings 2
		st2: new Hash({'color': '#489a1b'}), // Strings 3
		nu0: new Hash({'color': '#70483d'}), // Numbers
		me0: new Hash({'color': '#666666'}), // Methods and Functions
		br0: new Hash({'color': '#444444'}), // Brackets
		sy0: new Hash({'color': '#444444'}), // Symbols
		es0: new Hash({'color': '#444444'}), // Escape characters
		re0: new Hash({'color': '#784e0c'})  // Regular Expressions
	}),
	
	layout: new Hash({
		'numBgColor':  new Hash({'background-color': '#f2f2f2'}),
		'lineBgColor': new Hash({'background-color': '#fff'}),
		'lineNumStyles': new Hash({
			'color': '#939393',
			'font-size': '10px',
			'list-style': 'decimal-leading-zero'
		}),
		'lineStyles': new Hash({
			'border-top': '1px solid #fff',
			'border-bottom': '1px solid #fff',
			'border-left': '1px solid #939393',
			'padding': '0 3px 0 10px'
		}),
		'altLineStyles': new Hash({
			'border-top': '1px solid #eee',
			'border-bottom': '1px solid #eee',
			'background-color': '#F4F8FC'
		}),
		'top':    new Hash({'padding-top': '5px'}),
		'right':  new Hash({'padding-right': '5px'}),
		'bottom': new Hash({'padding-bottom': '5px'}),
		'left':   new Hash({'padding-left': '15px'}),
		'codeStyles': new Hash({
			'color': 'black',
			'font-size': '12px'
		})
	}),
	
	initialize: function(lighter, fuel) {this.parent(lighter, fuel);}
	
});
