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
this.history = [];}
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
  if (peek(opStk) == "(") {
   opStk.pop();
  } else {
   toPFR(opStk.pop());
  }
 }
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
