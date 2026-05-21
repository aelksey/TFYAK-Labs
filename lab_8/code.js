// ИНТЕРПРЕТАТОР

// Глобальные структуры ВМ
var semanticMemory = {};
var vmLabels = {};
var vmFunctions = {};
var vmCallStack = [];
var vmPendingArgs = [];
var semanticErrors = [];
var currentIp = 0;
var currentFunction = null;

// Очистка всех данных ВМ перед запуском
function clearVirtualMachine() {
    semanticMemory = {};
    vmLabels = {};
    vmFunctions = {};
    vmCallStack = [];
    vmPendingArgs = [];
    semanticErrors = [];
    currentIp = 0;
    currentFunction = null;
}

// Построение таблицы меток (LABEL)
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

// Построение таблицы функций (необязательно, ошибки не вызываем)
function buildVmFunctions() {
    // Ищем инструкции DECLARE
    for (var i = 0; i < pseudo.length; i++) {
        var cmd = pseudo[i];
        if (cmd.code === "DECLARE") {
            var funcName = cmd.op1;
            var paramCount = parseInt(cmd.op2, 10);
            if (isNaN(paramCount)) paramCount = 0;
            if (vmLabels.hasOwnProperty(funcName)) {
                vmFunctions[funcName] = {
                    startIndex: vmLabels[funcName],
                    paramCount: paramCount
                };
            }
        }
    }
    // Если DECLARE отсутствуют, попробуем использовать все неслужебные метки как функции
    if (Object.keys(vmFunctions).length === 0) {
        for (var label in vmLabels) {
            if (!/^Label(F|End|Start|SwitchEnd|Next)/.test(label)) {
                vmFunctions[label] = {
                    startIndex: vmLabels[label],
                    paramCount: 0
                };
            }
        }
    }
}

// Проверка наличия семантических ошибок
function hasSemanticErrors() {
    return semanticErrors.length > 0;
}

function addSemanticError(msg) {
    semanticErrors.push(msg);
}

// Получение значения переменной
function getValue(name) {
    if (name === undefined || name === "_") return undefined;
    if (!isNaN(name) && typeof name !== "string") return name;
    if (typeof name === "string" && /^-?\d+(\.\d+)?$/.test(name)) return parseFloat(name);
    if (semanticMemory.hasOwnProperty(name)) {
        return semanticMemory[name];
    } else {
        addSemanticError("Использование неинициализированной переменной: " + name);
        return undefined;
    }
}

function setValue(name, value) {
    if (name === undefined || name === "_") return;
    if (value === undefined) {
        addSemanticError("Попытка присвоить неопределённое значение переменной " + name);
        return;
    }
    semanticMemory[name] = value;
}

function isNumericValue(val) {
    return typeof val === "number" && !isNaN(val);
}

// Выполнение одной тетрады
function executePseudoCommand(cmd, ip) {
    var code = cmd.code;
    var op1 = cmd.op1;
    var op2 = cmd.op2;
    var res = cmd.res;

    if (code === "LABEL") {
        return ip + 1;
    }
    if (code === "=") {
        var val = getValue(op1);
        if (val !== undefined) setValue(res, val);
        return ip + 1;
    }
    if (code === "+" || code === "-" || code === "*" || code === "/" ||
        code === ">" || code === "<" || code === ">=" || code === "<=" ||
        code === "==" || code === "!=" || code === "&&" || code === "||") {
        var left = getValue(op1);
        var right = getValue(op2);
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
        else {
            addSemanticError("Неизвестная метка для Jmp: " + targetLabel);
            return ip + 1;
        }
    }
    if (code === "JmpF") {
        var condVal = getValue(op1);
        var falseLabel = op2;
        if (condVal === undefined) return ip + 1;
        if (condVal == 0) {
            if (vmLabels.hasOwnProperty(falseLabel)) return vmLabels[falseLabel];
            else {
                addSemanticError("Неизвестная метка для JmpF: " + falseLabel);
                return ip + 1;
            }
        } else return ip + 1;
    }
    if (code === "cast") {
        var srcVal = getValue(op1);
        if (srcVal === undefined) return ip + 1;
        var targetType = op2;
        var casted;
        if (targetType === "int") casted = Math.floor(Number(srcVal));
        else if (targetType === "float") casted = Number(srcVal);
        else if (targetType === "string") casted = String(srcVal);
        else if (targetType === "char") casted = String.fromCharCode(Number(srcVal));
        else {
            addSemanticError("Неизвестный тип приведения: " + targetType);
            casted = srcVal;
        }
        if (res !== "_") setValue(res, casted);
        return ip + 1;
    }
    if (code === "param") {
        var argVal = getValue(op1);
        if (argVal !== undefined) vmPendingArgs.push(argVal);
        return ip + 1;
    }
    if (code === "call") {
        var funcName = op1;
        var argc = parseInt(op2, 10);
        if (isNaN(argc)) argc = 0;
        // Если нет функций – игнорируем вызов
        if (Object.keys(vmFunctions).length === 0) {
            // Пропускаем вызов, очищаем ожидаемые аргументы
            vmPendingArgs = [];
            return ip + 1;
        }
        if (vmPendingArgs.length < argc) {
            addSemanticError("Недостаточно аргументов для вызова " + funcName);
            return ip + 1;
        }
        var args = vmPendingArgs.splice(0, argc);
        if (!vmFunctions.hasOwnProperty(funcName)) {
            addSemanticError("Вызов неопределённой функции: " + funcName);
            return ip + 1;
        }
        var funcInfo = vmFunctions[funcName];
        vmCallStack.push({
            returnIp: ip + 1,
            functionName: currentFunction ? currentFunction.name : null,
            savedMemory: JSON.parse(JSON.stringify(semanticMemory)) // сохраняем память
        });
        semanticMemory = {}; // новая локальная память
        for (var i = 0; i < args.length; i++) setValue("p" + i, args[i]);
        currentFunction = { name: funcName, startIndex: funcInfo.startIndex };
        return funcInfo.startIndex;
    }
    if (code === "return") {
        if (vmCallStack.length === 0) {
            return ip + 1;
        }
        var retVal = getValue(op1);
        if (retVal === undefined) retVal = 0;
        var caller = vmCallStack.pop();
        // Восстанавливаем память вызывающей функции
        semanticMemory = caller.savedMemory;
        // Сохраняем результат вызова в специальную переменную (для последующего использования вызывающим кодом)
        setValue("__return", retVal);
        currentFunction = caller.functionName ? { name: caller.functionName } : null;
        return caller.returnIp;
    }
    if (code === "DECLARE") {
        // Игнорируем
        return ip + 1;
    }
    addSemanticError("Неизвестная команда: " + code);
    return ip + 1;
}

// Основной запуск виртуальной машины
function run() {
    clearVirtualMachine();
    buildVmLabels();
    buildVmFunctions();

    if (Object.keys(vmFunctions).length === 0) {
        currentFunction = null;
        currentIp = 0;
        var steps = 0;
        var maxSteps = 1000000;          // большой лимит
        while (currentIp < pseudo.length && !hasSemanticErrors()) {
            if (steps > maxSteps) {
                // Не добавляем ошибку, просто выходим
                break;
            }
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
    var steps = 0;
    var maxSteps = 1000000;
    while (currentIp < pseudo.length && !hasSemanticErrors()) {
        if (steps > maxSteps) {
            // Без ошибки, просто прерываем выполнение
            break;
        }
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
}

// ПСЕВДОКОД

var pseudo = [];
var operandStk = [];     // стек операндов (имена переменных / временных)
var tempCounter = 0;     // счётчик для генерации временных переменных

// Генерация нового имени временной переменной
function newTemp() {
    return "t" + (tempCounter++);
}

// Добавление тетрады в псевдокод
function emitPseudo(code, op1, op2, res) {
    pseudo.push({
        code: code || "_",
        op1: op1 || "_",
        op2: op2 || "_",
        res: res || "_"
    });
}

// Очистка всех структур перед генерацией
function clearPseudoCode() {
    pseudo = [];
    operandStk = [];
    tempCounter = 0;
}

// Проверка типа слова ПФЗ (оставлена без изменений)
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
    if (isPseudoLabelDef(word)) return 40;
    if (word == "cast") return 50;
    if (isPseudoCall(word)) return 60;
    return 0;
}
function isPseudoLabelDef(word) {
    return typeof word == "string" && word.length > 0 && word[word.length - 1] == ":";
}
function isPseudoCall(word) {
    return typeof word == "string" && /^call[0-9]+$/.test(word);
}

// Основное преобразование ПФЗ в тетрады
function toPseudoCode() {
    clearPseudoCode();
    for (var i = 0; i < tracer.history.length; i++) {
        var word = tracer.history[i];
        var type = getPseudoType(word);

        if (type == 0) {                // операнд (переменная / константа)
            operandStk.push(word);
            continue;
        }
        if (type == 11) {               // унарная операция
            emitUnaryExprPseudo(word);
            continue;
        }
        if (type == 10) {               // бинарная операция
            emitBinaryExprPseudo(word);
            continue;
        }
        if (type == 20) {               // присваивание
            emitAssignPseudo();
            continue;
        }
        if (type == 30) {               // безусловный переход
            emitJumpPseudo();
            continue;
        }
        if (type == 31) {               // условный переход
            emitJumpFalsePseudo();
            continue;
        }
        if (type == 40) {               // определение метки
            emitLabelPseudo(word);
            continue;
        }
        if (type == 50) {               // приведение типа
            emitCastPseudo();
            continue;
        }
        if (type == 60) {               // вызов функции
            emitCallPseudo(word);
            continue;
        }
        if (type == 70) {
            emitDeclarePseudo();
            continue;
        }
    }
    // метки не преобразуются в смещения – остаются символическими
}

// Бинарная операция: left op right → temp
function emitBinaryExprPseudo(op) {
    var right = operandStk.pop();
    var left = operandStk.pop();
    var result = newTemp();
    emitPseudo(op, left, right, result);
    operandStk.push(result);
}

// Унарная операция: op value → temp
function emitUnaryExprPseudo(op) {
    var value = operandStk.pop();
    var result = newTemp();
    emitPseudo(op, value, "_", result);
    operandStk.push(result);
}

function emitDeclarePseudo() {
    var paramCount = operandStk.pop();
    var funcName = operandStk.pop(); // предположим, что имя функции было последним операндом перед DECLARE
    emitPseudo("DECLARE", funcName, String(paramCount), "_");
}

// Присваивание: target = value → value (результат присваивания)
function emitAssignPseudo() {
    var target = operandStk.pop();
    var value = operandStk.pop();
    emitPseudo("=", value, "_", target);
    // в стек операндов кладём значение (как результат присваивания)
    operandStk.push(value);
}

// Безусловный переход: Jmp label
function emitJumpPseudo() {
    var label = operandStk.pop();
    emitPseudo("Jmp", "_", label, "_");
}

// Условный переход: JmpF condition label
function emitJumpFalsePseudo() {
    var label = operandStk.pop();
    var condition = operandStk.pop();
    emitPseudo("JmpF", condition, label, "_");
}

// Определение метки (специальная псевдо-операция, не имеющая результата)
function emitLabelPseudo(labelWord) {
    var label = labelWord.substring(0, labelWord.length - 1);
    emitPseudo("LABEL", label, "_", "_");
}

// Приведение типа: cast value targetType → temp
function emitCastPseudo() {
    var targetType = operandStk.pop();
    var value = operandStk.pop();
    var result = newTemp();
    emitPseudo("cast", value, targetType, result);
    operandStk.push(result);
}

// Вызов функции: CALL func argc → result (если функция возвращает значение)
function emitCallPseudo(callWord) {
    var argc = parseInt(callWord.substring(4), 10);
    var funcName = operandStk.pop();
    var args = [];
    for (var i = 0; i < argc; i++) {
        args.unshift(operandStk.pop());
    }
    // Генерация инструкций для передачи аргументов (можно через param)
    for (var j = 0; j < args.length; j++) {
        emitPseudo("param", args[j], "_", "_");
    }
    var result = newTemp();
    emitPseudo("call", funcName, String(argc), result);
    operandStk.push(result);
}

// Формирование строкового представления тетрад
function pseudoCodeToString() {
    var r = "\n\nПсевдокод (тетрады: код op1 op2 результат):\n";
    for (var i = 0; i < pseudo.length; i++) {
        var p = pseudo[i];
        r += p.code + " " + p.op1 + " " + p.op2 + " " + p.res + "\n";
    }
    return r;
}

// Функция для вызова из основного кода транслятора
function printPseudoCode() {
    toPseudoCode();
    toPFR(pseudoCodeToString());
}

var ignoreLastWord;

function Tracer(){
 this.history = [];
};

Tracer.prototype = {
put: function(b){
 this.history.push(b);},

//формирование строки из истории работы
getAll: function(){
 var r = "";
 for(var i = 0; i < this.history.length; i++)
  r += " " + this.history[i];
 return r; },

//очистка истории
clear: function(){
 this.history = [];
 this.opStk = []; 
 this.ctlStk = [];
 this.switchStk = [];
 this.foreachStk = [];
 this.fnStk = [];
 this.castStk = [];
 this.declStk = []; // Полное обнуление стека деклараций при перезапуске транслятора
 this.operatorCnt = 0;
}
};

var tracer = new Tracer();
var opStk = []; 
var ctlStk=[];
var operatorCnt=0;

//добавление лексемы в историю
function toPFR(x) {
 tracer.put(x);}

function putCurrLex(parser) {
 toPFR(parser.currentLexem[1]);
}

//получение элемента с верхушки стека
function peek(o) {
 return o[o.length - 1];}

//получение приоритета арифметического знака
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
 return 0;}

//помещение бинарной операции в стек 
function pushBinOp(op) {
 if ((opStk.length > 0) && (getPriority(peek(opStk)) >= getPriority(op))) {
  toPFR(opStk.pop());
 }
 opStk.push(op);
}

//выгрузка бинарной операции из стека
function flushBinOp() {
 if (opStk.length > 0) {
  if (peek(opStk) == "(") {
   opStk.pop();
  } 
  else {
   toPFR(opStk.pop());
  }
 }
}

// Выгрузка унарной операции из стека
function flushUnOp() {
 if (opStk.length > 0) {
  var op = opStk.pop();
  if (op == "u_minus_to_bin") {
   // Добавляем 0 и бинарный минус после того, как операнд уже попал в историю (toPFR)
   toPFRs("0", "-"); 
  } else if (op == "u_plus_to_bin") {
   // Добавляем 0 и бинарный плюс
   toPFRs("0", "+");
  } else {
   toPFR(op);
  }
 }
}

//удаление открывающей скобки из стека
function popLeftBrack() {
 if ((opStk.length > 0) && (peek(opStk) == "(")) {
  opStk.pop();
 }
}

//выгрузка всех операций из стека
function flushAllOp() {
 while (opStk.length > 0) {
  var op = opStk.pop();
  var cleanOp = op ? op.toString() : "";
  
  // Игнорируем любые скобки и точки с запятой, которые могли зависнуть в стеке операций
  if (cleanOp === "(" || cleanOp === ")" || cleanOp === "{" || cleanOp === "}" || cleanOp === ";") {
   continue; 
  }
  
  if (cleanOp === "u_minus_to_bin") { 
   toPFRs("0", "-"); 
  } else if (cleanOp === "u_plus_to_bin") { 
   toPFRs("0", "+"); 
  } else { 
   toPFR(cleanOp); 
  }
 }
 
 // Очищаем стек деклараций функций, чтобы мусор не перетекал в следующие строки программы
 declStk = []; 
}




//начало обработки условного оператора
function begCond() {
 ctlStk.push(++operatorCnt);
}

//завершение обработки условия
function endCondExpr() {
 flushAllOp();
 toPFR("LabelF_" + peek(ctlStk));
 toPFR("JmpF");
}

//завершение true-ветки
function begCondEx() {
 toPFR("LabelEnd_" + peek(ctlStk));
 toPFR("Jmp");
 toPFR("LabelF_" + peek(ctlStk) + ":");
}

//завершение условного оператора
function endCond() {
 toPFR("LabelEnd_" + ctlStk.pop() + ":");
}

var foreachStk = [];

//добавление нескольких элементов в ПФЗ
function toPFRs() {
 for (var i = 0; i < arguments.length; i++) {
  toPFR(arguments[i]);
 }
}

//начало обработки foreach
function begFor() {
 foreachStk.push({id: ++operatorCnt, v: "", step: "1"});
}

//запоминание переменной цикла
function saveForVar(parser) {
 peek(foreachStk).v = parser.currentLexem[1];
}

//формирование начального присваивания
function emitForInit() {
 var f = peek(foreachStk);
 toPFRs(f.v, "=", "LabelStart_" + f.id + ":");
}

//начало формирования условия цикла
function begForCond() {
 var f = peek(foreachStk);
 toPFR(f.v);
}

//завершение формирования условия цикла
function emitForCond() {
 var f = peek(foreachStk);
 toPFRs("<=", "LabelEnd_" + f.id, "JmpOnFalse");
}

//запоминание шага цикла
function saveForStep(parser) {
 peek(foreachStk).step = parser.currentLexem[1];
}

//завершение foreach
function endFor() {
 var f = foreachStk.pop();
 toPFRs(f.v, f.v, f.step, "+", "=", "LabelStart_" + f.id, "Jmp", "LabelEnd_" + f.id + ":");
}

function emitLeave() {
 if (foreachStk.length > 0) {
  toPFR("LabelEnd_" + peek(foreachStk).id);
  toPFR("Jmp");
 }
}


// Помещение унарной операции в стек
function pushUnOp(op) {
 if (op == "-") {
  opStk.push("u_minus_to_bin"); // Используем маркер для конвертации в 0 -
 } else if (op == "+") {
  opStk.push("u_plus_to_bin");  // Используем маркер для конвертации в 0 +
 } else {
  opStk.push(op);
 }
}

// Добавления 7-ой лабы

var ignoreLastWord;

function Tracer(){
 this.history = [];
};

Tracer.prototype = {
put: function(b){
 this.history.push(b);},

//формирование строки из истории работы
getAll: function(){
 var r = "";
 for(var i = 0; i < this.history.length; i++)
  r += " " + this.history[i];
 return r; },

//очистка истории
clear: function(){
 this.history = [];
 this.opStk = []; 
 this.ctlStk = [];
 this.switchStk = [];
 this.foreachStk = [];
 this.fnStk = [];
 this.castStk = [];
 this.declStk = []; // Полное обнуление стека деклараций при перезапуске транслятора
 this.operatorCnt = 0;
}
};

var tracer = new Tracer();
var opStk = []; 
var ctlStk=[];
var operatorCnt=0;

//добавление лексемы в историю
function toPFR(x) {
 tracer.put(x);}

function putCurrLex(parser) {
 toPFR(parser.currentLexem[1]);
}

//получение элемента с верхушки стека
function peek(o) {
 return o[o.length - 1];}

//получение приоритета арифметического знака
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
 return 0;}

//помещение бинарной операции в стек 
function pushBinOp(op) {
 if ((opStk.length > 0) && (getPriority(peek(opStk)) >= getPriority(op))) {
  toPFR(opStk.pop());
 }
 opStk.push(op);
}

//выгрузка бинарной операции из стека
function flushBinOp() {
 if (opStk.length > 0) {
  if (peek(opStk) == "(") {
   opStk.pop();
  } 
  else {
   toPFR(opStk.pop());
  }
 }
}

// Выгрузка унарной операции из стека
function flushUnOp() {
 if (opStk.length > 0) {
  var op = opStk.pop();
  if (op == "u_minus_to_bin") {
   // Добавляем 0 и бинарный минус после того, как операнд уже попал в историю (toPFR)
   toPFRs("0", "-"); 
  } else if (op == "u_plus_to_bin") {
   // Добавляем 0 и бинарный плюс
   toPFRs("0", "+");
  } else {
   toPFR(op);
  }
 }
}

//удаление открывающей скобки из стека
function popLeftBrack() {
 if ((opStk.length > 0) && (peek(opStk) == "(")) {
  opStk.pop();
 }
}

//выгрузка всех операций из стека
function flushAllOp() {
 while (opStk.length > 0) {
  var op = opStk.pop();
  var cleanOp = op ? op.toString() : "";
  
  // Игнорируем любые скобки и точки с запятой, которые могли зависнуть в стеке операций
  if (cleanOp === "(" || cleanOp === ")" || cleanOp === "{" || cleanOp === "}" || cleanOp === ";") {
   continue; 
  }
  
  if (cleanOp === "u_minus_to_bin") { 
   toPFRs("0", "-"); 
  } else if (cleanOp === "u_plus_to_bin") { 
   toPFRs("0", "+"); 
  } else { 
   toPFR(cleanOp); 
  }
 }
 
 // Очищаем стек деклараций функций, чтобы мусор не перетекал в следующие строки программы
 declStk = []; 
}




//начало обработки условного оператора
function begCond() {
 ctlStk.push(++operatorCnt);
}

//завершение обработки условия
function endCondExpr() {
 flushAllOp();
 toPFR("LabelF_" + peek(ctlStk));
 toPFR("JmpF");
}

//завершение true-ветки
function begCondEx() {
 toPFR("LabelEnd_" + peek(ctlStk));
 toPFR("Jmp");
 toPFR("LabelF_" + peek(ctlStk) + ":");
}

//завершение условного оператора
function endCond() {
 toPFR("LabelEnd_" + ctlStk.pop() + ":");
}

// ПФЗ цикла foreach

var foreachStk = [];

function toPFRs() {
 for (var i = 0; i < arguments.length; i++) {
  toPFR(arguments[i]);
 }
}

function begFor() {
 foreachStk.push({id: ++operatorCnt, v: "", step: "1"});
}

function saveForVar(parser) {
 peek(foreachStk).v = parser.currentLexem[1];
}

function emitForInit() {
 var f = peek(foreachStk);
 toPFRs(f.v, "=", "LabelStart_" + f.id + ":");
}

function begForCond() {
 var f = peek(foreachStk);
 toPFR(f.v);   // выводим переменную
}

function emitForCond() {
 var f = peek(foreachStk);
 // В ПФЗ должно быть: переменная, верхняя_граница, <=, метка_выхода, JmpF
 // Предполагается, что верхняя граница уже выведена в грамматике перед вызовом emitForCond
 toPFRs("<=", "LabelEnd_" + f.id, "JmpF");
}

function saveForStep(parser) {
 peek(foreachStk).step = parser.currentLexem[1];
}

function endFor() {
 var f = foreachStk.pop();
 toPFRs(f.v, f.v, f.step, "+", "=", "LabelStart_" + f.id, "Jmp", "LabelEnd_" + f.id + ":");
}


// Помещение унарной операции в стек
function pushUnOp(op) {
 if (op == "-") {
  opStk.push("u_minus_to_bin"); // Используем маркер для конвертации в 0 -
 } else if (op == "+") {
  opStk.push("u_plus_to_bin");  // Используем маркер для конвертации в 0 +
 } else {
  opStk.push(op);
 }
}

// Добавления 7-ой лабы

// --- 2. Логика для оператора switch (choice) ---

var switchStk = [];

function begSwitch() {
 switchStk.push({
  id: ++operatorCnt,
  caseCount: 0,
  endLabel: "LabelSwitchEnd_" + operatorCnt
 });
}

function emitSwitchExpr() {
 // Выражение choice уже вычислено и лежит в ОПЗ
}

function begCase() {
 var sw = peek(switchStk);
 sw.caseCount++;
 var labelNext = "LabelNext_" + sw.id + "_" + sw.caseCount;
 // В ОПЗ: дублируем результат выражения choice, сравниваем с константой
 toPFRs(labelNext, "JmpF");
}

function endCase() {
 var sw = peek(switchStk);
 // Переход на конец switch при успешном выполнении ветки
 toPFRs(sw.endLabel, "Jmp");
 // Выставляем метку для случая несовпадения
 toPFR("LabelNext_" + sw.id + "_" + sw.caseCount + ":");
}

function begDefault() {
 // Метка для nooption совпадает с ложной меткой последнего case, которая уже выставлена
}

function emitSwitchExit() {
 var s = peek(switchStk);
 toPFRs("LabelEnd_" + s.id, "Jmp");
}

function endSwitch() {
 var sw = switchStk.pop();
 toPFR(sw.endLabel + ":");
 // Очищаем из стека вычислений само выражение choice
}

// --- 4. Приведение типов / Декларация типов ---

var castStk = [];

// Глобальные буферы для оператора типизации
var typizationId = "";
var typizationType = "";

function pushTypeCast(x) {
 // Сохраняем тип (например, "int")
 typizationType = x; 
 castStk.push(x);
}

// Новая функция для сохранения имени переменной прямо в момент разбора токена id
function saveTypizationId(x) {
 typizationId = x;
}

// --- 3. Логика для вызова функций и их аргументов ---

var fnStk = [];

function pushFnName(x) {
 // Временно сохраняем имя, так как это может быть просто переменная
 fnStk.push({ name: x, isFunc: false, argCount: 0 });
}

function startArgs() {
 // Если встретилась скобка (, значит это вызов функции, а не переменная
 var fn = peek(fnStk);
 fn.isFunc = true;
}

function cancelFnName() {
 // Если скобки не было, убираем из стека функций
 fnStk.pop();
}

function pushArg() {
 var fn = peek(fnStk);
 if (fn) fn.argCount++;
}

function emitFnCall() {
 var fn = fnStk.pop();
 toPFRs(fn.argCount, fn.name, "CALL");
}

// --- Логика объявления функций

var declStk = []; // Стек для хранения метаданных объявляемой функции

// Вызывается в самом начале объявления функции (при чтении возвращаемого типа)
function startFuncDecl(x) {
    declStk.push({
        retType: x,
        args: [], // Сюда будем складывать пары [тип, имя]
        argCount: 0
    });
}

// Вызывается при разборе каждого аргумента функции
function addFuncArg(argType, argId) {
    if (declStk.length > 0) {
        var currentDecl = peek(declStk);
        currentDecl.args.push(argType);
        currentDecl.args.push(argId);
        currentDecl.argCount++;
    }
}

// Вызывается перед разбором тела функции, чтобы вытолкнуть заголовок в ОПЗ
function emitFuncDecl() {
    if (declStk.length > 0) {
        var currentDecl = declStk.pop();
        
        // 1. Выводим возвращаемый тип функции
        toPFR(currentDecl.retType);
        
        // 2. Выводим все пары аргументов (тип и имя)
        for (var i = 0; i < currentDecl.args.length; i++) {
            toPFR(currentDecl.args[i]);
        }
        
        // 3. Выводим количество аргументов и команду DECLARE
        toPFRs(currentDecl.argCount, "DECLARE");
    }
}

// ПФЗ

var ignoreLastWord;

function Tracer(){
 this.history = [];
};

Tracer.prototype = {
put: function(b){
 this.history.push(b);},

//формирование строки из истории работы
getAll: function(){
 var r = "";
 for(var i = 0; i < this.history.length; i++)
  r += " " + this.history[i];
 return r; },

//очистка истории
clear: function(){
 this.history = [];
 this.opStk = []; 
 this.ctlStk = [];
 this.switchStk = [];
 this.foreachStk = [];
 this.fnStk = [];
 this.castStk = [];
 this.declStk = []; // Полное обнуление стека деклараций при перезапуске транслятора
 this.operatorCnt = 0;
}
};

var tracer = new Tracer();
var opStk = []; 
var ctlStk=[];
var operatorCnt=0;

//добавление лексемы в историю
function toPFR(x) {
 tracer.put(x);}

function putCurrLex(parser) {
 toPFR(parser.currentLexem[1]);
}

//получение элемента с верхушки стека
function peek(o) {
 return o[o.length - 1];}

//получение приоритета арифметического знака
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
 return 0;}

//помещение бинарной операции в стек 
function pushBinOp(op) {
 if ((opStk.length > 0) && (getPriority(peek(opStk)) >= getPriority(op))) {
  toPFR(opStk.pop());
 }
 opStk.push(op);
}

//выгрузка бинарной операции из стека
function flushBinOp() {
 if (opStk.length > 0) {
  if (peek(opStk) == "(") {
   opStk.pop();
  } 
  else {
   toPFR(opStk.pop());
  }
 }
}

// Выгрузка унарной операции из стека
function flushUnOp() {
 if (opStk.length > 0) {
  var op = opStk.pop();
  if (op == "u_minus_to_bin") {
   // Добавляем 0 и бинарный минус после того, как операнд уже попал в историю (toPFR)
   toPFRs("0", "-"); 
  } else if (op == "u_plus_to_bin") {
   // Добавляем 0 и бинарный плюс
   toPFRs("0", "+");
  } else {
   toPFR(op);
  }
 }
}

//удаление открывающей скобки из стека
function popLeftBrack() {
 if ((opStk.length > 0) && (peek(opStk) == "(")) {
  opStk.pop();
 }
}

//выгрузка всех операций из стека
function flushAllOp() {
 while (opStk.length > 0) {
  var op = opStk.pop();
  var cleanOp = op ? op.toString() : "";
  
  // Игнорируем любые скобки и точки с запятой, которые могли зависнуть в стеке операций
  if (cleanOp === "(" || cleanOp === ")" || cleanOp === "{" || cleanOp === "}" || cleanOp === ";") {
   continue; 
  }
  
  if (cleanOp === "u_minus_to_bin") { 
   toPFRs("0", "-"); 
  } else if (cleanOp === "u_plus_to_bin") { 
   toPFRs("0", "+"); 
  } else { 
   toPFR(cleanOp); 
  }
 }
 
 // Очищаем стек деклараций функций, чтобы мусор не перетекал в следующие строки программы
 declStk = []; 
}




//начало обработки условного оператора
function begCond() {
 ctlStk.push(++operatorCnt);
}

//завершение обработки условия
function endCondExpr() {
 flushAllOp();
 toPFR("LabelF_" + peek(ctlStk));
 toPFR("JmpF");
}

//завершение true-ветки
function begCondEx() {
 toPFR("LabelEnd_" + peek(ctlStk));
 toPFR("Jmp");
 toPFR("LabelF_" + peek(ctlStk) + ":");
}

//завершение условного оператора
function endCond() {
 toPFR("LabelEnd_" + ctlStk.pop() + ":");
}

// ПФЗ цикла foreach

var foreachStk = [];

function toPFRs() {
 for (var i = 0; i < arguments.length; i++) {
  toPFR(arguments[i]);
 }
}

function begFor() {
 foreachStk.push({id: ++operatorCnt, v: "", step: "1"});
}

function saveForVar(parser) {
 peek(foreachStk).v = parser.currentLexem[1];
}

function emitForInit() {
 var f = peek(foreachStk);
 toPFRs(f.v, "=", "LabelStart_" + f.id + ":");
}

function begForCond() {
 var f = peek(foreachStk);
 toPFR(f.v);   // выводим переменную
}

function emitForCond() {
    var f = peek(foreachStk);
    toPFRs("<=", "LabelEnd_" + f.id, "JmpF");
}

function saveForStep(parser) {
 peek(foreachStk).step = parser.currentLexem[1];
}

function endFor() {
 var f = foreachStk.pop();
 toPFRs(f.v, f.v, f.step, "+", "=", "LabelStart_" + f.id, "Jmp", "LabelEnd_" + f.id + ":");
}


// Помещение унарной операции в стек
function pushUnOp(op) {
 if (op == "-") {
  opStk.push("u_minus_to_bin"); // Используем маркер для конвертации в 0 -
 } else if (op == "+") {
  opStk.push("u_plus_to_bin");  // Используем маркер для конвертации в 0 +
 } else {
  opStk.push(op);
 }
}

// Добавления 7-ой лабы

// --- 2. Логика для оператора switch (choice) ---

var switchStk = [];

function begSwitch() {
 switchStk.push({
  id: ++operatorCnt,
  caseCount: 0,
  endLabel: "LabelSwitchEnd_" + operatorCnt
 });
}

function emitSwitchExpr() {
 // Выражение choice уже вычислено и лежит в ОПЗ
}

function begCase() {
 var sw = peek(switchStk);
 sw.caseCount++;
 var labelNext = "LabelNext_" + sw.id + "_" + sw.caseCount;
 // В ОПЗ: дублируем результат выражения choice, сравниваем с константой
 toPFRs(labelNext, "JmpF");
}

function endCase() {
 var sw = peek(switchStk);
 // Переход на конец switch при успешном выполнении ветки
 toPFRs(sw.endLabel, "Jmp");
 // Выставляем метку для случая несовпадения
 toPFR("LabelNext_" + sw.id + "_" + sw.caseCount + ":");
}

function begDefault() {
 // Метка для nooption совпадает с ложной меткой последнего case, которая уже выставлена
}

function emitSwitchExit() {
 var s = peek(switchStk);
 toPFRs("LabelEnd_" + s.id, "Jmp");
}

function endSwitch() {
 var sw = switchStk.pop();
 toPFR(sw.endLabel + ":");
 // Очищаем из стека вычислений само выражение choice
}

// --- 4. Приведение типов / Декларация типов ---

var castStk = [];

// Глобальные буферы для оператора типизации
var typizationId = "";
var typizationType = "";

function pushTypeCast(x) {
 // Сохраняем тип (например, "int")
 typizationType = x; 
 castStk.push(x);
}

// Новая функция для сохранения имени переменной прямо в момент разбора токена id
function saveTypizationId(x) {
 typizationId = x;
}

// --- 3. Логика для вызова функций и их аргументов ---

var fnStk = [];

function pushFnName(x) {
 // Временно сохраняем имя, так как это может быть просто переменная
 fnStk.push({ name: x, isFunc: false, argCount: 0 });
}

function startArgs() {
 // Если встретилась скобка (, значит это вызов функции, а не переменная
 var fn = peek(fnStk);
 fn.isFunc = true;
}

function cancelFnName() {
 // Если скобки не было, убираем из стека функций
 fnStk.pop();
}

function pushArg() {
 var fn = peek(fnStk);
 if (fn) fn.argCount++;
}

function emitFnCall() {
 var fn = fnStk.pop();
 toPFRs(fn.argCount, fn.name, "CALL");
}

// --- Логика объявления функций

var declStk = []; // Стек для хранения метаданных объявляемой функции

// Вызывается в самом начале объявления функции (при чтении возвращаемого типа)
function startFuncDecl(x) {
    declStk.push({
        retType: x,
        args: [], // Сюда будем складывать пары [тип, имя]
        argCount: 0
    });
}

// Вызывается при разборе каждого аргумента функции
function addFuncArg(argType, argId) {
    if (declStk.length > 0) {
        var currentDecl = peek(declStk);
        currentDecl.args.push(argType);
        currentDecl.args.push(argId);
        currentDecl.argCount++;
    }
}

// Вызывается перед разбором тела функции, чтобы вытолкнуть заголовок в ОПЗ
function emitFuncDecl() {
    if (declStk.length > 0) {
        var currentDecl = declStk.pop();
        
        // 1. Выводим возвращаемый тип функции
        toPFR(currentDecl.retType);
        
        // 2. Выводим все пары аргументов (тип и имя)
        for (var i = 0; i < currentDecl.args.length; i++) {
            toPFR(currentDecl.args[i]);
        }
        
        // 3. Выводим количество аргументов и команду DECLARE
        toPFRs(currentDecl.argCount, "DECLARE");
    }
}

