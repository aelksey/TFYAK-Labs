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