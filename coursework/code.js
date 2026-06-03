// ============================
// Виртуальная машина для тетрад
// ============================

// Глобальные структуры ВМ
var semanticMemory = {};
var vmLabels = {};
var vmFunctions = {};
var vmCallStack = [];
var vmPendingArgs = [];
var semanticErrors = [];
var currentIp = 0;
var currentFunction = null;

// Таблица объектов
var objectTable = [];
var nextObjectId = 0;

function addObject(name, type, value, argCount, argNames) {
    var obj = {
        id: nextObjectId++,
        name: name,
        type: type,
        value: (value !== undefined && value !== null) ? value : "-",
        argCount: argCount || 0,
        args: argNames ? argNames.join(", ") : ""
    };
    objectTable.push(obj);
    return obj.id;
}

function updateObjectValue(name, value, type) {
    for (var i = 0; i < objectTable.length; i++) {
        if (objectTable[i].name === name && objectTable[i].type.startsWith("variable")) {
            // Обновляем существующую запись
            objectTable[i].value = value;
            objectTable[i].type = "variable: " + type;
            return;
        }
    }
    // Не найдена – добавляем новую
    addObject(name, "variable: " + type, value, 0, []);
}

function printObjectTable() {
    var r = "\n\nТаблица объектов после выполнения:\n";
    r += "id\tname\tvalue\ttype\t\targCount\targs\n";
    r += "---\t----\t-----\t----\t\t--------\t----\n";
    for (var i = 0; i < objectTable.length; i++) {
        var obj = objectTable[i];
        r += obj.id + "\t" + obj.name + "\t" + obj.value + "\t" + obj.type;
        if (obj.type.length < 16) r += "\t\t";
        else r += "\t";
        r += obj.argCount + "\t\t" + obj.args + "\n";
    }
    return r;
}

function clearVirtualMachine() {
    semanticMemory = {};
    vmLabels = {};
    vmFunctions = {};
    vmCallStack = [];
    vmPendingArgs = [];
    semanticErrors = [];
    currentIp = 0;
    currentFunction = null;
    objectTable = [];
    nextObjectId = 0;
}

function buildVmLabels() {
    for (var i = 0; i < pseudo.length; i++) {
        var cmd = pseudo[i];
        if (cmd.code === "LABEL") {
            var labelName = cmd.op1;
            if (vmLabels.hasOwnProperty(labelName)) {
                addSemanticError("Повторное объявление метки: " + labelName);
            } else {
                vmLabels[labelName] = i;
            }
        }
    }
}

function buildVmFunctions() {
    for (var i = 0; i < pseudo.length; i++) {
        var cmd = pseudo[i];
        if (cmd.code === "DECLARE") {
            var funcName = cmd.op1;
            var paramCount = parseInt(cmd.op2, 10);
            if (isNaN(paramCount)) paramCount = 0;
            var paramNames = (typeof cmd.res === "string") ? cmd.res.split(",") : [];
            if (vmLabels.hasOwnProperty(funcName)) {
                vmFunctions[funcName] = {
                    startIndex: vmLabels[funcName],
                    paramCount: paramCount,
                    paramNames: paramNames
                };
            } else {
                vmFunctions[funcName] = {
                    startIndex: -1,
                    paramCount: paramCount,
                    paramNames: paramNames
                };
            }
            addObject(funcName, "function", "-", paramCount, paramNames);
        }
    }
    for (var funcName in vmFunctions) {
        if (vmFunctions[funcName].startIndex === -1 && vmLabels.hasOwnProperty(funcName)) {
            vmFunctions[funcName].startIndex = vmLabels[funcName];
        }
    }
    if (Object.keys(vmFunctions).length === 0) {
        for (var label in vmLabels) {
            if (!/^Label(F|End|Start|SwitchEnd|Next)/.test(label)) {
                vmFunctions[label] = {
                    startIndex: vmLabels[label],
                    paramCount: 0,
                    paramNames: []
                };
                addObject(label, "function", "-", 0, []);
            }
        }
    }
}

function hasSemanticErrors() { return semanticErrors.length > 0; }
function addSemanticError(msg) { semanticErrors.push(msg); }

function parseLiteral(str) {
    if (typeof str !== "string") return null;
    if (str === "") return null;
    // Строковый литерал в двойных кавычках
    if (str.startsWith('"') && str.endsWith('"')) {
        return { value: str.slice(1, -1), type: "string" };
    }
    // Символьный литерал в одинарных кавычках
    if (str.startsWith("'") && str.endsWith("'")) {
        return { value: str.slice(1, -1), type: "char" };
    }
    // Троичное число (цифры 0-2, суффикс x3)
    var match3 = str.match(/^([0-2]+)x3$/);
    if (match3) {
        var val3 = parseInt(match3[1], 3);
        if (!isNaN(val3)) return { value: val3, type: "int" };
    }
    // Семеричное число (цифры 0-6, суффикс x7)
    var match7 = str.match(/^([0-6]+)x7$/);
    if (match7) {
        var val7 = parseInt(match7[1], 7);
        if (!isNaN(val7)) return { value: val7, type: "int" };
    }
    // Десятичное целое
    if (/^-?\d+$/.test(str)) {
        return { value: parseInt(str, 10), type: "int" };
    }
    // Десятичное с плавающей точкой
    if (/^-?\d+\.\d+$/.test(str)) {
        return { value: parseFloat(str), type: "float" };
    }
    return null;
}

function getValue(name) {
    if (name === undefined || name === "_") return undefined;
    // Литерал
    var parsed = parseLiteral(name);
    if (parsed !== null) return parsed.value;
    // Переменная
    if (semanticMemory.hasOwnProperty(name)) {
        var entry = semanticMemory[name];
        if (entry && typeof entry === "object") return entry.value;
        else return entry; // для совместимости
    }
    addSemanticError("Использование неинициализированной переменной: " + name);
    return undefined;
}

function setValue(name, value) {
    if (name === undefined || name === "_") return;
    if (value === undefined) {
        addSemanticError("Попытка присвоить неопределённое значение переменной " + name);
        return;
    }
    // Определяем тип
    var type = "unknown";
    if (typeof value === "number") {
        type = (value % 1 === 0) ? "int" : "float";
    } else if (typeof value === "string") {
        type = "string";
    } else if (typeof value === "boolean") {
        type = "bool";
    }
    semanticMemory[name] = { value: value, type: type };
    updateObjectValue(name, value, type);
}

function isNumericValue(val) { return typeof val === "number" && !isNaN(val); }

function executePseudoCommand(cmd, ip) {
    var code = cmd.code, op1 = cmd.op1, op2 = cmd.op2, res = cmd.res;
    if (code === "LABEL") return ip + 1;
    if (code === "=") {
        var val = getValue(op1);
        if (val !== undefined) setValue(res, val);
        return ip + 1;
    }
    if (code === "+" || code === "-" || code === "*" || code === "/" ||
        code === ">" || code === "<" || code === ">=" || code === "<=" ||
        code === "==" || code === "!=" || code === "&&" || code === "||") {
        var left = getValue(op1), right = getValue(op2);
        if (left === undefined || right === undefined) return ip + 1;
        var result;
        if (code === "+") {
            if (isNumericValue(left) && isNumericValue(right)) result = left + right;
            else addSemanticError("Операнды не числа: " + op1 + " " + op2);
        } else if (code === "-") {
            if (isNumericValue(left) && isNumericValue(right)) result = left - right;
            else addSemanticError("Операнды не числа");
        } else if (code === "*") {
            if (isNumericValue(left) && isNumericValue(right)) result = left * right;
            else addSemanticError("Операнды не числа");
        } else if (code === "/") {
            if (isNumericValue(left) && isNumericValue(right)) {
                if (right === 0) addSemanticError("Деление на ноль");
                else result = left / right;
            } else addSemanticError("Операнды не числа");
        } else if (code === ">") result = (left > right) ? 1 : 0;
        else if (code === "<") result = (left < right) ? 1 : 0;
        else if (code === ">=") result = (left >= right) ? 1 : 0;
        else if (code === "<=") result = (left <= right) ? 1 : 0;
        else if (code === "==") result = (left == right) ? 1 : 0;
        else if (code === "!=") result = (left != right) ? 1 : 0;
        else if (code === "&&") result = (left != 0 && right != 0) ? 1 : 0;
        else if (code === "||") result = (left != 0 || right != 0) ? 1 : 0;
        if (result !== undefined && res !== "_") setValue(res, result);
        return ip + 1;
    }
    if (code === "~" || code === "!" || code === "--" || code === "++" || code === "u-" || code === "u+") {
        var valOp = getValue(op1);
        if (valOp === undefined) return ip + 1;
        var unaryRes;
        if (code === "~") unaryRes = ~valOp;
        else if (code === "!") unaryRes = (valOp == 0) ? 1 : 0;
        else if (code === "--") unaryRes = valOp - 1;
        else if (code === "++") unaryRes = valOp + 1;
        else if (code === "u-") unaryRes = -valOp;
        else if (code === "u+") unaryRes = +valOp;
        if (unaryRes !== undefined && res !== "_") setValue(res, unaryRes);
        return ip + 1;
    }
    if (code === "Jmp") {
        var targetLabel = op2;
        if (vmLabels.hasOwnProperty(targetLabel)) return vmLabels[targetLabel];
        addSemanticError("Неизвестная метка для Jmp: " + targetLabel);
        return ip + 1;
    }
    if (code === "JmpF") {
        var condVal = getValue(op1), falseLabel = op2;
        if (condVal === undefined) return ip + 1;
        if (condVal == 0) {
            if (vmLabels.hasOwnProperty(falseLabel)) return vmLabels[falseLabel];
            addSemanticError("Неизвестная метка для JmpF: " + falseLabel);
            return ip + 1;
        }
        return ip + 1;
    }
    if (code === "cast") {
        var srcVal = getValue(op1), targetType = op2, casted;
        if (srcVal === undefined) return ip + 1;
        if (targetType === "int") casted = Math.floor(Number(srcVal));
        else if (targetType === "float") casted = Number(srcVal);
        else if (targetType === "string") casted = String(srcVal);
        else if (targetType === "char") casted = String.fromCharCode(Number(srcVal));
        else { addSemanticError("Неизвестный тип приведения: " + targetType); casted = srcVal; }
        if (res !== "_") setValue(res, casted);
        return ip + 1;
    }
    if (code === "param") {
        var argVal = getValue(op1);
        if (argVal !== undefined) vmPendingArgs.push(argVal);
        return ip + 1;
    }
    if (code === "call") {
        var funcName = op1, argc = parseInt(op2, 10);
        if (isNaN(argc)) argc = 0;
        if (vmPendingArgs.length < argc) {
            addSemanticError("Недостаточно аргументов для вызова " + funcName);
            if (res !== "_") setValue(res, 0);
            return ip + 1;
        }
        var args = vmPendingArgs.splice(0, argc);
        if (!vmFunctions.hasOwnProperty(funcName)) {
            addSemanticError("Вызов неопределённой функции: " + funcName);
            if (res !== "_") setValue(res, 0);
            return ip + 1;
        }
        var funcInfo = vmFunctions[funcName];
        vmCallStack.push({
            returnIp: ip + 1,
            functionName: currentFunction ? currentFunction.name : null,
            savedMemory: JSON.parse(JSON.stringify(semanticMemory))
        });
        semanticMemory = {};
        for (var i = 0; i < args.length; i++) {
            setValue("p" + i, args[i]);
            if (funcInfo.paramNames && funcInfo.paramNames[i]) setValue(funcInfo.paramNames[i], args[i]);
        }
        currentFunction = { name: funcName, startIndex: funcInfo.startIndex };
        return funcInfo.startIndex;
    }
    if (code === "return") {
        if (vmCallStack.length === 0) return ip + 1;
        var retVal = getValue(op1);
        if (retVal === undefined) retVal = 0;
        var caller = vmCallStack.pop();
        semanticMemory = caller.savedMemory;
        setValue("__return", retVal);
        currentFunction = caller.functionName ? { name: caller.functionName } : null;
        return caller.returnIp;
    }
    if (code === "DECLARE") return ip + 1;
    addSemanticError("Неизвестная команда: " + code);
    return ip + 1;
}

function run() {
    clearVirtualMachine();
    buildVmLabels();
    buildVmFunctions();

    if (Object.keys(vmFunctions).length === 0) {
        currentFunction = null;
        currentIp = 0;
        var steps = 0, maxSteps = 100000;
        while (currentIp < pseudo.length && !hasSemanticErrors()) {
            if (steps > maxSteps) { addSemanticError("Превышено максимальное количество шагов выполнения (возможно, бесконечный цикл)."); break; }
            var cmd = pseudo[currentIp];
            if (!cmd) break;
            currentIp = executePseudoCommand(cmd, currentIp);
            steps++;
        }
        return !hasSemanticErrors();
    }

    var firstFuncName = Object.keys(vmFunctions)[0];
    currentFunction = { name: firstFuncName, startIndex: vmFunctions[firstFuncName].startIndex };
    currentIp = currentFunction.startIndex;
    var steps = 0, maxSteps = 100000;
    while (currentIp < pseudo.length && !hasSemanticErrors()) {
        if (steps > maxSteps) { addSemanticError("Превышено максимальное количество шагов выполнения (возможно, бесконечный цикл)."); break; }
        if (currentFunction && currentIp >= pseudo.length && vmCallStack.length === 0) break;
        var cmd = pseudo[currentIp];
        if (!cmd) break;
        currentIp = executePseudoCommand(cmd, currentIp);
        steps++;
    }
    return !hasSemanticErrors();
}

function semanticErrorsToString() {
    if (!hasSemanticErrors()) return "\nВыполнение завершено без ошибок.\n";
    var r = "\nОшибки выполнения:\n";
    for (var i = 0; i < semanticErrors.length; i++) r += (i+1) + ". " + semanticErrors[i] + "\n";
    return r;
}

function printSemanticErrors() {
    toPFR(semanticErrorsToString());
    toPFR(printObjectTable());
}

// ============================
// Генератор псевдокода (тетрады)
// ============================
var pseudo = [];
var operandStk = [];
var tempCounter = 0;

function newTemp() {
    var name = "t" + (tempCounter++);
    addObject(name, "variable: temp", "(not initialized)", 0, []);
    return name;
}

function emitPseudo(code, op1, op2, res) {
    pseudo.push({ code: code || "_", op1: op1 || "_", op2: op2 || "_", res: res || "_" });
}

function clearPseudoCode() { pseudo = []; operandStk = []; tempCounter = 0; }

function isPseudoBinaryOp(op) {
    return op == "||" || op == "&&" || op == "!=" || op == "==" ||
           op == "<=" || op == "<" || op == ">=" || op == ">" ||
           op == "-" || op == "+" || op == "*" || op == "/";
}
function isPseudoUnaryOp(op) {
    return op == "~" || op == "!" || op == "--" || op == "++" || op == "u-" || op == "u+";
}
function getPseudoType(word) {
    if (isPseudoBinaryOp(word)) return 10;
    if (isPseudoUnaryOp(word)) return 11;
    if (word == "=") return 20;
    if (word == "Jmp") return 30;
    if (word == "JmpF") return 31;
    if (word == "DECLARE") return 70;
    if (word == "DUP") return 80;
    if (isPseudoLabelDef(word)) return 40;
    if (word == "cast") return 50;
    if (isPseudoCall(word)) return 60;
    return 0;
}
function isPseudoLabelDef(word) { return typeof word == "string" && word.length > 0 && word[word.length-1] == ":"; }
function isPseudoCall(word) { return word == "CALL"; }

function toPseudoCode() {
    clearPseudoCode();
    for (var i = 0; i < tracer.history.length; i++) {
        var word = tracer.history[i];
        var type = getPseudoType(word);
        if (type == 0) { operandStk.push(word); continue; }
        if (type == 11) { emitUnaryExprPseudo(word); continue; }
        if (type == 10) { emitBinaryExprPseudo(word); continue; }
        if (type == 20) { emitAssignPseudo(); continue; }
        if (type == 30) { emitJumpPseudo(); continue; }
        if (type == 31) { emitJumpFalsePseudo(); continue; }
        if (type == 40) { emitLabelPseudo(word); continue; }
        if (type == 50) { emitCastPseudo(); continue; }
        if (type == 60) { emitCallPseudo(word); continue; }
        if (type == 70) { emitDeclarePseudo(); continue; }
        if (type == 80) { emitDupPseudo(); continue; }
    }
}

function emitBinaryExprPseudo(op) {
    var right = operandStk.pop(), left = operandStk.pop(), result = newTemp();
    emitPseudo(op, left, right, result);
    operandStk.push(result);
}
function emitUnaryExprPseudo(op) {
    var value = operandStk.pop(), result = newTemp();
    emitPseudo(op, value, "_", result);
    operandStk.push(result);
}
function emitDeclarePseudo() {
    var paramNamesStr = operandStk.pop(), paramCount = parseInt(operandStk.pop(), 10), funcName = operandStk.pop();
    emitPseudo("DECLARE", funcName, String(paramCount), paramNamesStr);
}
function emitAssignPseudo() {
    var target = operandStk.pop(), value = operandStk.pop();
    emitPseudo("=", value, "_", target);
    operandStk.push(value);
}





function emitJumpPseudo() { var label = operandStk.pop(); emitPseudo("Jmp", "_", label, "_"); }
function emitJumpFalsePseudo() { var label = operandStk.pop(), condition = operandStk.pop(); emitPseudo("JmpF", condition, label, "_"); }
function emitLabelPseudo(labelWord) { var label = labelWord.substring(0, labelWord.length-1); emitPseudo("LABEL", label, "_", "_"); }
function emitCastPseudo() { var targetType = operandStk.pop(), value = operandStk.pop(), result = newTemp(); emitPseudo("cast", value, targetType, result); operandStk.push(result); }
function emitDupPseudo() { var value = operandStk.pop(); operandStk.push(value); operandStk.push(value); }
function emitCallPseudo(callWord) {
    var funcName = operandStk.pop(), argc = parseInt(operandStk.pop(), 10);
    if (isNaN(argc)) argc = 0;
    var args = [];
    for (var i = 0; i < argc; i++) args.unshift(operandStk.pop());
    for (var j = 0; j < args.length; j++) emitPseudo("param", args[j], "_", "_");
    var result = newTemp();
    emitPseudo("call", funcName, String(argc), result);
    operandStk.push(result);
}
function pseudoCodeToString() {
    var r = "\n\nПсевдокод (тетрады: код op1 op2 результат):\n";
    for (var i = 0; i < pseudo.length; i++) r += pseudo[i].code + " " + pseudo[i].op1 + " " + pseudo[i].op2 + " " + pseudo[i].res + "\n";
    return r;
}
function printPseudoCode() { toPseudoCode(); toPFR(pseudoCodeToString()); }

// ============================
// Постфиксная форма (ПФЗ) и вспомогательные функции
// ============================
var ignoreLastWord;

function Tracer(){
    this.history = [];
}
Tracer.prototype = {
    put: function(b){ this.history.push(b); },
    getAll: function(){ var r = ""; for(var i=0;i<this.history.length;i++) r+=" "+this.history[i]; return r; },
    clear: function(){
        this.history = [];
        this.opStk = [];
        this.ctlStk = [];
        this.switchStk = [];
        this.foreachStk = [];
        this.fnStk = [];
        this.castStk = [];
        this.declStk = [];
        this.operatorCnt = 0;
    }
};

var tracer = new Tracer();
var opStk = [];
var ctlStk = [];
var operatorCnt = 0;

function toPFR(x) { tracer.put(x); }
function putCurrLex(parser) { toPFR(parser.currentLexem[1]); }
function peek(o) { return o[o.length-1]; }

function getPriority(s) {
    if (s == "(") return 0;
    if (s == "||") return 5;
    if (s == "&&") return 10;
    if (s == "!=") return 15;
    if (s == "==") return 15;
    if (s == "<=") return 20;
    if (s == "<") return 20;
    if (s == ">=") return 20;
    if (s == ">") return 20;
    if (s == "-") return 25;
    if (s == "+") return 25;
    if (s == "*") return 30;
    if (s == "/") return 30;
    if (s == "~") return 35;
    if (s == "!") return 35;
    if (s == "--") return 35;
    if (s == "++") return 35;
    return 0;
}

function pushBinOp(op) {
    if (opStk.length>0 && getPriority(peek(opStk)) >= getPriority(op)) toPFR(opStk.pop());
    opStk.push(op);
}
function flushBinOp() { if (opStk.length>0) { if (peek(opStk)=="(") opStk.pop(); else toPFR(opStk.pop()); } }
function flushUnOp() {
    if (opStk.length>0) {
        var op = opStk.pop();
        if (op == "u_minus_to_bin") toPFRs("0","-");
        else if (op == "u_plus_to_bin") toPFRs("0","+");
        else toPFR(op);
    }
}
function popLeftBrack() { if (opStk.length>0 && peek(opStk)=="(") opStk.pop(); }
function flushAllOp() {
    while (opStk.length>0) {
        var op = opStk.pop(), cleanOp = op ? op.toString() : "";
        if (cleanOp === "(" || cleanOp === ")" || cleanOp === "{" || cleanOp === "}" || cleanOp === ";") continue;
        if (cleanOp === "u_minus_to_bin") toPFRs("0","-");
        else if (cleanOp === "u_plus_to_bin") toPFRs("0","+");
        else toPFR(cleanOp);
    }
    declStk = [];
}
function toPFRs() { for(var i=0;i<arguments.length;i++) toPFR(arguments[i]); }

// Условный оператор
function begCond() { ctlStk.push(++operatorCnt); }
function endCondExpr() { flushAllOp(); toPFR("LabelF_"+peek(ctlStk)); toPFR("JmpF"); }
function begCondEx() { toPFR("LabelEnd_"+peek(ctlStk)); toPFR("Jmp"); toPFR("LabelF_"+peek(ctlStk)+":"); }
function endCond() { toPFR("LabelEnd_"+ctlStk.pop()+":"); }

// Цикл foreach
var foreachStk = [];
function begFor() { foreachStk.push({id:++operatorCnt, v:"", step:"1"}); }
function saveForVar(parser) { peek(foreachStk).v = parser.currentLexem[1]; }
function emitForInit() { var f=peek(foreachStk); toPFRs(f.v,"=","LabelStart_"+f.id+":"); }
function begForCond() { var f=peek(foreachStk); toPFR(f.v); }
function emitForCond() { var f=peek(foreachStk); toPFRs("<=","LabelEnd_"+f.id,"JmpF"); }
function saveForStep(parser) { peek(foreachStk).step = parser.currentLexem[1]; }
function endFor() { var f=foreachStk.pop(); toPFRs(f.v,f.step,"+",f.v,"=","LabelStart_"+f.id,"Jmp","LabelEnd_"+f.id+":"); }
function emitLeave() { if(foreachStk.length>0) toPFRs("LabelEnd_"+peek(foreachStk).id,"Jmp"); }

// Унарные операции
function pushUnOp(op) {
    if(op=="-") opStk.push("u_minus_to_bin");
    else if(op=="+") opStk.push("u_plus_to_bin");
    else opStk.push(op);
}

// Switch (choice) — ИСПРАВЛЕНА
var switchTempVarStack = [];
var tempCaseConst = 0;
var tempConst = 0;

function saveCaseConst(parser) {
    currentConst = parseInt(parser.currentLexem[1], 10);
}

var switchStk = [];
function begSwitch() {
    var id = ++operatorCnt;
    var tempVar = "sw_" + id;
    switchTempVarStack.push(tempVar);
    switchStk.push({ id: id, caseCount: 0, endLabel: "LabelSwitchEnd_" + id, tempVar: tempVar });
}
function emitSwitchExpr() {
    var sw = peek(switchStk);
    toPFR(sw.tempVar);
    toPFR("=");
}
function startOption() {
    var sw = peek(switchStk);
    // Загружаем значение из временной переменной на стек
    toPFR(sw.tempVar);
    toPFR("DUP");
}
function finishOption() {
    var sw = peek(switchStk);
    var nextLabel = "LabelNext_" + sw.id + "_" + (sw.caseCount + 1);
    toPFR("==");
    toPFR(nextLabel);
    toPFR("JmpF");
    sw.caseCount++;
}
function endOption() {
    var sw = peek(switchStk);
    var nextLabel = "LabelNext_" + sw.id + "_" + sw.caseCount;
    toPFRs(sw.endLabel, "Jmp");
    toPFR(nextLabel + ":");
}
function endSwitch() {
    var sw = switchStk.pop();
    toPFR(sw.endLabel + ":");
}

// Типизация
var typizationId = "", typizationType = "";
function pushTypeCast(x) { typizationType = x; castStk.push(x); }
function saveTypizationId(x) { typizationId = x; }

// Вызов функций
var fnStk = [];
function pushFnName(x) { fnStk.push({ name: x, isFunc: false, argCount: 0 }); }
function startArgs() { var fn = peek(fnStk); fn.isFunc = true; }
function cancelFnName() { fnStk.pop(); }
function pushArg() { var fn = peek(fnStk); if (fn) fn.argCount++; }
function emitFnCall() { var fn = fnStk.pop(); toPFRs(fn.argCount, fn.name, "CALL"); }

// Объявление функций
var declStk = [];
function startFuncDecl(x) { declStk.push({ retType: x, args: [], argCount: 0 }); }
function addFuncArg(argType, argId) {
    if (declStk.length > 0) {
        var currentDecl = peek(declStk);
        currentDecl.args.push(argType);
        currentDecl.args.push(argId);
        currentDecl.argCount++;
    }
}
function emitFuncDecl() {
    if (declStk.length > 0) {
        var currentDecl = declStk.pop();
        toPFR(currentDecl.retType);
        for (var i = 0; i < currentDecl.args.length; i++) toPFR(currentDecl.args[i]);
        toPFR(currentDecl.argCount);
        toPFR("DECLARE");
        var names = [];
        for (var j = 0; j < currentDecl.argCount; j++) names.push(currentDecl.args[2*j+1]);
        toPFR(names.join(","));
    }
}

