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
choice r0r == 2
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
    return r0r+m0m;
}, x1y);

// Вызов функции
$(x1y(x2y,2), x1y);



// Test 2

@ int x1y;
$(10+2*3, x1y);

$(1, n0n);
$(1, r0r);
$(1, i0i);

when n0n > 0 {
    $(r0r + i0i, r0r);
} else {
    $(r0r, m0m);
}

choice r0r == 2
    option 1 : { $(100, r0r); } fin;
    option 2 : { $(200, r0r); }
    nooption { $(0, r0r); }
end

TODO: Create a Report

In coursework - fix loop - fix function declaration PFZ and etc


$(i0i, n0n);

