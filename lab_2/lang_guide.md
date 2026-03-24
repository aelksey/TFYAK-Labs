```
// Оператор присваивания
$(10, x1y);

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
int (int n0n, int m0m){
    $(m0m + r0r,r0r);
    $(0,r0r); 
    return r0r+m0m;
}

// Inline-функции
int (int n0n){return n0n;}

```