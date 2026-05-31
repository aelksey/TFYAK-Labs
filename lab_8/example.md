// Оператор присваивания
$(10+2+3, x1y);
// Результат 10 2 3 * + x1y =

// Ошибки
// Деление на ноль
// $(10 / 0, n0n);
// Использование неинициализированой переменной
// $(1, n0n);
// $(1, r0r);
//$(3, i0i);


// Оператор присваивания
$(10+2+3, x1y);

// Оператор типизации
@ int x1y;



// Условный оператор
when n0n > 0 {
    $(r0r + i0i,r0r);
} else {
    $(r0r, m0m);
}

// Оператор цикла - 
// a:b:i 
// a - левая граница
// b - правая граница
// i - инкремент отсчёта
foreach (i0i in 1:10:2) {
    $(r0r + i0i, r0r);
    leave;
}

// Оператор - переключатель
$(1, l0l);

choice l0l
    option 1 : { $(100,r0r); } fin;
    option 2 : { $(200,r0r); }
    nooption { 
        $(0,r0r); 
    }
end

// Обьявление функций
$(int (int n0n, int m0m){
    $(m0m + r0r,r0r);
    $(0,r0r); 
    return r0r+m0m;
}, x1y);

// Обьявление функций
$(int (int n0n, int m0m){ 
    return n0n+m0m;
}, x1y);

// Вызов функции
$(x1y(x2y,2), x1y);




// Examples

// Example 1 - Assignment
@ int x1y;
$(10+2*3, x1y);

// Example 2 - Assignment
@ int x1y;
$(10+2+3, x1y);

// Example 3 condition - True 
$(1, n0n);

when n0n > 0 {
    $(1, r0r);
} else {
    $(1, m0m);
}

// Example 4 condition - False 
$(0, n0n);

when n0n > 0 {
    $(1, r0r);
} else {
    $(1, m0m);
}

// Example 5 Cycle - Correct - with leave
$(1, r0r);

foreach (i0i in 1:10:1) {
    $(r0r + i0i, r0r);
    leave;
}

// Example 6 Cycle - Correct - without leave
$(1, r0r);

foreach (i0i in 1:10:1) {
    $(r0r + i0i, r0r);
}

// Example 7 Cycle - Infinite - 0 increment
$(1, r0r);

foreach (i0i in 1:10:0) {
    $(r0r + i0i, r0r);
}

// Example 8 Cycle - Infinite - too big border b
$(1, r0r);

foreach (i0i in 1:1000000000:0) {
    $(r0r + i0i, r0r);
}

// Example 9 - All variables



@ int x1y;
$(10, x1y);
@ float y1x;
$(3.14, y1x);
@ string s1x;
$("Hello", s1x);
@ char c1a;
$('A', c1a);

// Example 10 - Switch Option I:

$(1, l0l);

choice l0l
    option 1 : { $(100,r0r); }
    option 2 : { $(200,r0r); }
    option 3 : { $(300,r0r); }
    nooption { 
        $(120,r0r); 
    }
end

// Example 11 - Switch Option II:

$(2, l0l);

choice l0l
    option 1 : { $(100,r0r); }
    option 2 : { $(200,r0r); }
    option 3 : { $(300,r0r); }
    nooption { 
        $(120,r0r); 
    }
end

// Example 12 - Switch Option III:

$(3, l0l);

choice l0l
    option 1 : { $(100,r0r); }
    option 2 : { $(200,r0r); }
    option 3 : { $(300,r0r); }
    nooption { 
        $(120,r0r); 
    }
end

// Example 13 - Switch noOption:

$(4, l0l);

choice l0l
    option 1 : { $(100,r0r); }
    option 2 : { $(200,r0r); }
    option 3 : { $(300,r0r); }
    nooption { 
        $(120,r0r); 
    }
end

// Example 14 - Using uninitialized variable
@ int l0l;
$(m0m, l0l);


