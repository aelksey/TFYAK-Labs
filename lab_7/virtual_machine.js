function VirtualMachine() {
    this.tetrads = [];       // Список сгенерированных тетрад
    this.dataStack = [];     // Стек данных для вычислений
    this.variables = {};     // Пространство памяти (переменные)
    this.tempCounter = 0;    // Счётчик временных переменных T_i
}

VirtualMachine.prototype = {
    // Создание новой временной переменной для хранения промежуточного результата
    nextTemp: function() {
        this.tempCounter++;
        return "T" + this.tempCounter;
    },

    // Добавление тетрады в список
    addTetrad: function(op, op1, op2, res) {
        this.tetrads.push({
            op: op,
            op1: op1 !== undefined ? op1 : "",
            op2: op2 !== undefined ? op2 : "",
            res: res !== undefined ? res : ""
        });
    },

    // Печать тетрад в требуемом формате: <Код><Оп><Оп><Р>
    printTetrads: function() {
        var result = "=== СГЕНЕРИРОВАННЫЙ ПСЕВДОКОД (ТЕТРАДЫ) ===\n";
        for (var i = 0; i < this.tetrads.length; i++) {
            var t = this.tetrads[i];
            result += i + ": <" + t.op + "> <" + t.op1 + "> <" + t.op2 + "> <" + t.res + ">\n";
        }
        return result;
    },

    // Главный метод: Исполнение / Интерпретация строки ОПЗ
    execute: function(pfrString) {
        // Разбиваем строку ОПЗ на отдельные токены по пробелам
        var tokens = pfrString.trim().split(/\s+/);
        this.dataStack = [];
        this.tetrads = [];
        this.tempCounter = 0;

        var i = 0;
        while (i < tokens.length) {
            var token = tokens[i];
            if (token === "") {
                i++;
                continue;
            }

            // --- 1. Бинарные математические и логические операции ---
            if (token === "+" || token === "-" || token === "*" || token === "/" || 
                token === "==" || token === "!=" || token === "<=" || token === ">" || token === "<" || token === ">=") {
                
                var operand2 = this.dataStack.pop();
                var operand1 = this.dataStack.pop();
                var tempRes = this.nextTemp();
                
                this.addTetrad(token, operand1, operand2, tempRes);
                this.dataStack.push(tempRes); // Результат кладем обратно в стек
            }
            
            // --- 2. Оператор присваивания (=) ---
            else if (token === "=") {
                var targetVar = this.dataStack.pop(); // Имя переменной (куда присваиваем)
                var val = this.dataStack.pop();       // Значение выражения
                
                this.addTetrad("=", val, "", targetVar);
            }
            
            // --- 3. Команды управления стеком (DUP и DROP для switch/choice) ---
            else if (token === "DUP") {
                var top = this.dataStack[this.dataStack.length - 1];
                this.dataStack.push(top);
            }
            else if (token === "DROP") {
                this.dataStack.pop();
            }
            
            // --- 4. Безусловный переход (Jmp) ---
            else if (token === "Jmp") {
                var label = this.dataStack.pop();
                this.addTetrad("JMP", "", "", label);
            }
            
            // --- 5. Условные переходы (JmpF / JmpOnFalse) ---
            else if (token === "JmpF" || token === "JmpOnFalse") {
                var label = this.dataStack.pop();    // Куда прыгать
                var condition = this.dataStack.pop(); // Переменная с условием (T_i)
                
                this.addTetrad("JMPF", condition, "", label);
            }
            
            // --- 6. Метки переходов (вида Label: ) ---
            else if (token.indexOf(":") !== -1) {
                var cleanLabel = token.replace(":", "");
                this.addTetrad("LABEL", "", "", cleanLabel);
            }
            
            // --- 7. Декларация переменных (DECLARE_VAR) ---
            else if (token === "DECLARE_VAR") {
                var type = this.dataStack.pop();
                var varName = this.dataStack.pop();
                
                this.addTetrad("DECLARE_VAR", varName, type, "");
                this.variables[varName] = { type: type, value: null };
            }
            
            // --- 8. Декларация сигнатуры функций (DECLARE) ---
            else if (token === "DECLARE") {
                var argCount = parseInt(this.dataStack.pop());
                var args = [];
                for (var k = 0; k < argCount; k++) {
                    var argId = this.dataStack.pop();
                    var argType = this.dataStack.pop();
                    args.unshift({ type: argType, id: argId });
                }
                var retType = this.dataStack.pop();
                
                // В тетрадах фиксируем объявление функции
                this.addTetrad("FUNC_DECLARE", retType, argCount, "ARGS:" + JSON.stringify(args));
            }
            
            // --- 9. Вызов функции (CALL) ---
            else if (token === "CALL") {
                var funcName = this.dataStack.pop();
                var callArgCount = parseInt(this.dataStack.pop());
                
                // Снимаем аргументы вызова со стека
                var callArgs = [];
                for (var k = 0; k < callArgCount; k++) {
                    callArgs.unshift(this.dataStack.pop());
                }
                
                var callTempRes = this.nextTemp();
                this.addTetrad("CALL", funcName, callArgs.join(","), callTempRes);
                this.dataStack.push(callTempRes); // Функция возвращает значение в стек
            }
            
            // --- 10. Возврат из функции (RETURN) ---
            else if (token === "RETURN") {
                var retVal = this.dataStack.pop();
                this.addTetrad("RETURN", retVal, "", "");
            }
            
            // --- 11. Обычные операнды (числа, имена переменных, названия меток) ---
            else {
                this.dataStack.push(token);
            }

            i++;
        }

        return this.printTetrads();
    }
};
