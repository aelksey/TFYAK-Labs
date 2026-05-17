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

