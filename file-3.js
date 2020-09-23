function Calculator(attrs) {
	"use strict";
	var displayText = "0",
		state = 0,
		piText,
		operandText = "0",
		rpnList = [],
		operatorStack = [],
		opPrec = {"m" : 3, "+" : 1, "-" : 1, "x" : 2, "/" : 2},		// "m" is unary minus
	
		// state transition table
		stt = [
			/*0*/ [{rem: /[C\=]/, ns: 0}, {rem: /[0-9]/, ns: 1}, {rem: /p/, ns: 2}, {rem: /\./, ns: 3}, {rem: /[\+\x\/]/, ns: 4}, {rem: /\-/, ns: 5}, {rem: /r/, ns: 0}],
			/*1*/ [{rem: /[\d]/, ns: 1},{rem: /C/, ns: 0},  {rem: /\./, ns: 3}, {rem: /[\+\-x\/]/, ns: 4}, {rem: /r/, ns: "sqrt"},  {rem: /\=/, ns: "calc"}],
			/*2*/ [{rem: /[C]/, ns: 0}, {rem: /[\dp\.\=]/, ns: "error"}, {rem: /[\+\-x\/]/, ns: 4},{rem: /r/, ns: "sqrt"},  {rem: /\=/, ns: "calc"}],
			/*3*/ [{rem: /[C]/, ns: 0}, {rem: /[0-9]/, ns: 3},{rem: /[\+\-x\/]/, ns: 4}, {rem: /r/, ns: "sqrt"}, {rem: /\=/, ns: "calc"}],
			/*4*/ [{rem: /[C]/, ns: 0},{rem: /[0-9]/, ns: 1},{rem: /p/, ns: 2},{rem: /[\-]/, ns: 5}, {rem: /\./, ns: 3}],
			/*5*/ [{rem: /[C]/, ns: 0}, {rem: /[0-9]/, ns: 1}, {rem: /p/, ns: 2}, {rem: /\./, ns: 3}],
			/*6*/ [{rem: /[C]/, ns: 0}]
		],
	
		// button state table
		bst = [
			/*0*/ [{"class": "num", enabled: true},{"class": "op", enabled: false}, {"class": "opm", enabled: true},{"class": "pi", enabled: true}, {"class": "rad", enabled: false}, {"class": "eq", enabled: false},{"class": "dec", enabled: true},{"class": "bks", enabled: false}],
			/*1*/ [{"class": "num", enabled: true},{"class": "op", enabled: true}, {"class": "opm", enabled: true},{"class": "pi", enabled: false}, {"class": "rad", enabled: true}, {"class": "eq", enabled: true},{"class": "dec", enabled: true},{"class": "bks", enabled: true}],
			/*2*/ [{"class": "num", enabled: false},{"class": "op", enabled: true}, {"class": "opm", enabled: true},{"class": "pi", enabled: false}, {"class": "rad", enabled: true}, {"class": "eq", enabled: true},{"class": "dec", enabled: false},{"class": "bks", enabled: true}],
			/*3*/ [{"class": "num", enabled: true},{"class": "op", enabled: true}, {"class": "opm", enabled: true},{"class": "pi", enabled: false}, {"class": "rad", enabled: true}, {"class": "eq", enabled: true},{"class": "dec", enabled: false},{"class": "bks", enabled: true}],
			/*4*/ [{"class": "num", enabled: true},{"class": "op", enabled: false}, {"class": "opm", enabled: true},{"class": "pi", enabled: true}, {"class": "rad", enabled: false}, {"class": "eq", enabled: true},{"class": "dec", enabled: true},{"class": "bks", enabled: true}],
			/*5*/ [{"class": "num", enabled: true},{"class": "op", enabled: false}, {"class": "opm", enabled: false},{"class": "pi", enabled: true}, {"class": "rad", enabled: false}, {"class": "eq", enabled: false},{"class": "dec", enabled: true},{"class": "bks", enabled: true}],
			/*6*/ [{"class": "num", enabled: true},{"class": "op", enabled: true}, {"class": "opm", enabled: true},{"class": "pi", enabled: false}, {"class": "rad", enabled: false}, {"class": "eq", enabled: true},{"class": "dec", enabled: true},{"class": "bks", enabled: true}]
		];
	
	attrs = attrs || {};
	attrs.sigFigs = attrs.sigFigs || 12;
	attrs.errText = attrs.errText || "Error";
	attrs.displayLimit1 = attrs.displayLimit1 || 14;
	attrs.displayLimit2 = attrs.displayLimit2 || 22;
	attrs.displayLimit3 = attrs.displayLimit3 || 56;
	attrs.maxChars = attrs.maxChars || 100;
	piText = Math.PI.toFixed(attrs.sigFigs-1);
	
	function getDisplayTextLength() {
		var textT = displayText.replace(/(\&times)|(\&minus)/g, '');
		return textT.length;
	}
	
	function selectText() {
		
		// from http://stackoverflow.com/questions/12243898/how-to-select-all-text-in-contenteditable-div
		var doc = document,
			element = $(this)[0],
			range, selection;
		if (doc.body.createTextRange) {
		   range = document.body.createTextRange();
		   range.moveToElementText(element);
		   range.select();
		} else if (window.getSelection) {
		   selection = window.getSelection();        
		   range = document.createRange();
		   range.selectNodeContents(element);
		   selection.removeAllRanges();
		   selection.addRange(range);
		}
	}
	
	function createDom(containerId) {
		
		// bf 58471
		window.resizeTo(350, 350);
		
		var calcBody, table, row, divChar;
		divChar = /MSIE\s*9/.test(navigator.userAgent) ? "/" : "&div;";
		$('<div/>', {"class": "calcHeader"}).appendTo(containerId);
		calcBody = $('<div/>', {"class": "calcBody"});
		calcBody.appendTo(containerId);
		$('<div/>', {"class": "displayWindow"}).html("0").appendTo(calcBody);
		table = $('<table/>');
		row = $("<tr/>", {"class": "topSpace"});
		$("<td/>", {"colspan": "7", "class": "topSpace"}).appendTo(row);
		row.appendTo(table);
		
		row = $("<tr/>");
		$("<td/>", {"class": "padding"}).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton num", "id": "b55", "val": "7"}).html("7"))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton num", "id": "b56", "val": "8"}).html("8"))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton num", "id": "b57", "val": "9"}).html("9"))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton op", "id": "b47", "val": "/"}).html(divChar))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton clr", "id": "b27", "val": "C"}).html("C"))).appendTo(row);
		$("<td/>", {"class": "padding"}).appendTo(row);
		row.appendTo(table);
		
		row = $("<tr/>");
		$("<td/>", {"class": "padding"}).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton num", "id": "b52", "val": "4"}).html("4"))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton num", "id": "b53", "val": "5"}).html("5"))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton num", "id": "b54", "val": "6"}).html("6"))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton op", "id": "b42", "val": "x"}).html("&times;"))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton rad", "id": "b114", "val": "r"}).html("&radic;"))).appendTo(row);
		$("<td/>", {"class": "padding"}).appendTo(row);
		row.appendTo(table);
		
		row = $("<tr/>");
		$("<td/>", {"class": "padding"}).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton num", "id": "b49", "val": "1"}).html("1"))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton num", "id": "b50", "val": "2"}).html("2"))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton num", "id": "b51", "val": "3"}).html("3"))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton opm", "id": "b45", "val": "-"}).html("&minus;"))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton pi", "id": "b112", "val": "p"}).html("&pi;"))).appendTo(row);
		$("<td/>", {"class": "padding"}).appendTo(row);
		row.appendTo(table);
		
		row = $("<tr/>");
		$("<td/>", {"class": "padding"}).appendTo(row);
		($("<td/>", {"colspan": "2"}).append($("<button/>", {"class": "calcButton zeroButton num", "id": "b48", "val": "0"}).html("0"))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton dec", "id": "b46", "val": "."}).html("."))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton op", "id": "b43", "val": "+"}).html("+"))).appendTo(row);
		($("<td/>").append($("<button/>", {"class": "calcButton eq", "id": "b13", "val": "="}).html("="))).appendTo(row);
		$("<td/>", {"class": "padding"}).appendTo(row);
		row.appendTo(table);
		
		table.appendTo(calcBody);
		
	}
	
	function isOperator(token) {
		return (/[\+\-x\/m]/).test(token) && token.length === 1;
	}
	
	function setButtonStates(state) {
		var buttonStates, digitCount;
		
		if (state === "error") {
			$('.calcButton').addClass('disabled').prop('disabled', true);
			$('.clr').removeClass('disabled').prop('disabled', false);
			
		} else {
	
			buttonStates = bst[state];
			buttonStates.forEach(function(item) {
				if (item.enabled) {
					$('.'+item['class']).removeClass('disabled').prop('disabled', false);
				} else {
					$('.'+item['class']).addClass('disabled').prop('disabled', true);
				}
			});
			if (!(rpnList.length && operandText && operatorStack.length)) {
				$('.eq').addClass('disabled').prop('disabled', true);
			} else if (operatorStack.length) {
				$('.rad').addClass('disabled').prop('disabled', true);
			}
			if (/\d+e/.test(displayText)) {
				$('.op,.opm').addClass('disabled').prop('disabled', true);
			}
			digitCount = operandText.replace(/\D/g,"").length;
			if (getDisplayTextLength() > attrs.maxChars) {
				$('.num,.pi,.op,.opm').addClass('disabled').prop('disabled', true);
			} else if (digitCount === attrs.sigFigs) {
				$('.num').addClass('disabled').prop('disabled', true);
			}
		}
		
	}
	
	function calcResult() {
		
		var iRpn = 0,
			token,
			operandStack = [],
			operand1, operand2;
			
		rpnList.push(+operandText);
		
		while (operatorStack.length > 0) {
			rpnList.push(operatorStack.pop());
		}
		
		for (iRpn = 0; iRpn < rpnList.length; iRpn++) {
			token = rpnList[iRpn];
			if (!isOperator(token)) {
				operandStack.push(token);
			} else if (token === "m") {
				operandStack[operandStack.length-1] *= -1;
			} else {
				operand2 = operandStack.pop();
				operand1 = operandStack.pop();
				switch(token) {
					case "+":
						operandStack.push(operand1 + operand2);
						break;
					case "-":
						operandStack.push(operand1 - operand2);
						break;
					case "x":
						operandStack.push(operand1 * operand2);
						break;
					case "/":
						operandStack.push(operand1 / operand2);
						break;
				}
			}
		}
		
		// TODOx debug 
		if (operandStack.length !== 1) {
			throw new Error ("Invalid postfix");
		}
		
		
		return operandStack[0];
	}
	
	function formatResult(result) {
		var resultText,
			testText = String(result),
			decimalPlacesOut = 0,
			decimalPlacesIn = 0,
			mantissa, eParts, 
			iDecimal = testText.indexOf(".");
			
		function formatExp(eText) {
			var mantissa, eParts = eText.split('e');
			if (iDecimal !== -1 && eText.length - iDecimal > decimalPlacesOut) {
				mantissa = parseFloat(eParts[0]).toFixed(decimalPlacesOut);
			} else {
				mantissa = eParts[0];
			}
			mantissa = mantissa.replace(/0+$/,"").replace(/\.$/,"");
			return mantissa + 'e' + eParts[1];
		}
			
		if (iDecimal !== -1) {
			decimalPlacesOut = Math.max(attrs.sigFigs - iDecimal, 0);	
			decimalPlacesIn = testText.length - iDecimal - 1;
		}
		
		if (/\d+e/.test(testText)) {
			resultText = formatExp(testText);
			
		} else if (decimalPlacesOut === 0 && iDecimal > 1) {
			testText = result.toExponential();
			iDecimal = testText.indexOf(".");
			if (iDecimal === -1) {
				decimalPlacesOut = 0;
			} else {
				decimalPlacesOut = Math.max(attrs.sigFigs - iDecimal, 0);	
			}
			resultText = formatExp(testText);
			
		} else if (decimalPlacesIn > decimalPlacesOut) {
			resultText = result.toFixed(decimalPlacesOut).replace(/0+$/,"").replace(/\.$/,"");
		} else {
			resultText = String(result);
		}
		return resultText;
	
	}
	
	function changeState(inToken) {
		var newState, matchState, items, iItem, item, result;
		
		if (inToken === "C") {
			matchState = 0;
			
		} else {
			items = stt[state];
			matchState = "StateError";
		
			for (iItem = 0; iItem < items.length; iItem++) {
				item = items[iItem];
				if (item.rem.test(inToken)) {
					matchState = item.ns;
				}
			}
		}
		newState = matchState;
		
		
		switch (matchState) {
			case 0:
				displayText = "";
				operandText = displayText;
				rpnList = [];
				operatorStack = [];
				break;
			
			case 1:
				if (state === 0) {
					displayText = inToken;
					operandText = inToken;
				} else {
					displayText += inToken;
					operandText += inToken;
				}
				break;
			
			case 2:
				if (state !== 0) {
					displayText += piText;
					operandText += piText;
				} else {
					displayText = piText;
					operandText = piText;
				}
				break;
				
			case 3:
				if (state === 0) {
					displayText = "0.";
					operandText = "0.";
				} else {
					
					// insert 0 in front of naked decimal if necessary
					if (inToken === '.' && !/\d/.test(displayText[displayText.length-1])) {
						displayText += '0';
						operandText = '0';
					}
					
					displayText += inToken;
					operandText += inToken;
				}
				break;
				
			case 4:
				// inToken is an operator
				rpnList.push(+operandText);
				operandText = "";
				if (operatorStack.length === 0) {
					operatorStack.push(inToken);
				} else { 
					while (operatorStack.length && opPrec[operatorStack[operatorStack.length-1]] >= opPrec[inToken]) {
						rpnList.push(operatorStack.pop());
					}
					operatorStack.push(inToken);
				}
				
				if (inToken === "x") {
					inToken = "&times;";
				} else if (inToken === "-") {
					inToken = "&minus;";
				}
				displayText += (" " + inToken + " ");
				break;
				
			case 5:
				// unary minus
				if (state === 0) {
					displayText = "";
					operandText = "";
				}
				displayText += "&minus;";
				operatorStack.push("m");
				break;
				
			case 6:
				displayText += inToken;
				operandText += inToken;
				break;
				
			case 7:
				displayText += piText;
				break;
			
			case "sqrt":
				// negative number
				if (isNaN(+displayText)) {
					displayText = attrs.errText;
					newState = "error";
				} else {
					displayText = formatResult(Math.sqrt(+displayText));
					operandText = displayText;
					newState = 2;
				}
				break;
				
			case "calc":
				result = calcResult();
				if (!isFinite(result)) {
					newState = "error";
					displayText = attrs.errText;
					
				} else {
					if (result < 0) {
						displayText = "&minus;" + formatResult(-1*result);
						operatorStack.push("m");
						operandText = String(-1*result);
					} else {
						displayText = formatResult(result);
						operandText = String(result);
					}
					
					newState = 2;
				}
				rpnList = [];
				break;
				
			case "error":
				break;
			
			default:
				break;
				//throw new Error ("State error");
		}
		
		//console.log("Changing state: " + state + " --> " + newState);
		if (newState !== "StateError") {
			state = newState;
			setButtonStates(state);
		}
		
		
		// TODOx - won't be necessary if change displayWindow from input to div
		//decoded = $('<div/>').html(displayText).text();
		//$('.displayWindow').val(decoded);
		$('.displayWindow').html(displayText);
		if (getDisplayTextLength() > attrs.displayLimit3) {
			$('.displayWindow').removeClass('small verySmall').addClass('extraSmall');
		} else if (getDisplayTextLength() > attrs.displayLimit2) {
			$('.displayWindow').removeClass('small extraSmall').addClass('verySmall');
		} else if (getDisplayTextLength() > attrs.displayLimit1) {
			$('.displayWindow').removeClass('verySmall extraSmall').addClass('small');
		} else {
			$('.displayWindow').removeClass('small verySmall extraSmall');
		}
	}
	
	
	
	function keyPress(key) {
		//console.log(key.which);
		var keyMap = {
			8:	"b27",
			27: "b27",
			67: "b27",
			99: "b27",
			
			13: "b13",
			61: "b13",
			
			42: "b42",
			120: "b42",
			88: "b42",
			43: "b43",
			45:	"b45",
			46: "b46",
			47: "b47",
			
			48: "b48",
			49: "b49",
			50: "b50",
			51: "b51",
			52: "b52",
			53: "b53",
			54: "b54",
			55: "b55",
			56: "b56",
			57: "b57",
			
			112: "b112",
			80:  "b112",
			114: "b114",
			82:	 "b114"
			
		},
		
		//buttonId = '#'+ keyMap[key.keyCode];
		buttonId = '#'+ keyMap[key.which];
		
		if (!key.metaKey && !key.altKey && !key.ctrlKey && buttonId !== "#undefined" && !$(buttonId).prop('disabled')) {
			changeState($(buttonId).val());
			return false;
		}
		return true;
	}
	
	// IE does not generate keypress for enter key
	function keyDown(key) {
		if (key.which === 13) {
			keyPress(key);	
		}
	}
	
	// hooks for automated testing
	this.remove = function() {
		$('.calcHeader').remove();
		$('.calcBody').remove();
	};
	this.charIn = function(charIn) {
		var key = {keyCode: charIn.charCodeAt(0), which: charIn.charCodeAt(0), ctrlKey:false, metaKey:false, altKey:false};
		keyPress(key);
	};
	this.getDisplay = function() {
		return displayText;
	};
	
	
	createDom(attrs.container);
	$('.displayWindow').html(displayText);
	changeState('C');
	$('.calcButton').click(
		function() {changeState($(this).val());}
	);
	
	// choose header div as element to receive the focus
	if (!attrs.noKbd) {
		$('.displayWindow').attr('tabindex', -1).keypress(keyPress).focus().blur(function() {this.focus();}).click(selectText);
		if (/MSIE|Trident/.test(navigator.userAgent)) {
			$('.calcHeader').keydown(keyDown);
		}
	}
	return this;
	
}