# Твоя система правил

id [a-zA-Z] [0-9] {,3} [a-zA-Z]

space [ \t\r\n] + {ignoreLastWord=true;}

constDecimal [0-9] + ( [.] [0-9] * ) ?

constThree [0-2] + [x] [3]

constSeven [0-6] + [x] [7]

constChar ['] ( [] | [\\] [u] [0-9a-fA-F] [0-9a-zA-F] ) [']

constString ["] ( [] | ( [\\] ["\\] ) | ( [\\] [u] [0-9a-fA-F] [0-9a-zA-F] ) ) * ["]

comment [/] [/] [] * [\\][\\]{ignoreLastWord=true;}

sign [-+/%*]

const constDecimal | constThree | constSeven | constChar | constString

type "int" | "float" | "tri" | "sev"

expr (type?" "id) | (const)(sign expr)?

assign "$" "(" id "," expr ")"


# Система правил из готовой лабы №2 (малявко лаб 2)

id [a-zA-z]+
int [0-9]+
char ['] [] [']
string ["] []+ []
bin [S] [01]+
four [#] [0-3]+
sign [-+*/]
space [ \t\r\n]+{ignoreLastWord=true;}
comment [/] [/] []* [\\] [\\] {ignoreLastWord=true;} 
assign id "set" Expr ","
Expr ( id | const) ( sign Expr)?
cond "at" Expr "do" block ( condElse )?
block ( assign | Expr | loop | switch | cond ) (block)?
loop "exec" block "with" id "from" const "to" const ("step" const)?
switch "switch" Expr "{" switchBody ( "any do" block )? "}"
switchBody "by" const "do" block ( "off" ";" )? ( switchBody )?
function id "(" ( id | const)? ")" ( "ret" type )? "{" block "}"
type "char" | "string" | "bin" | "int" | "double" | "four"
const int | string | char | double | bin | four
double [0-9]+[.][0-9]+
condElse "or" "do" block

# Система правил, которая нужна

id [a-zA-Z] [0-9] {,3} [a-zA-Z]

space [ \t\r\n] + {ignoreLastWord=true;}

constDecimal [0-9] + ( [.] [0-9] * ) ?

constThree [0-2] + [x] [3]

constSeven [0-6] + [x] [7]

constChar ['] ( [] | [\\] [u] [0-9a-fA-F] [0-9a-zA-F] ) [']

constString ["] ( [] | ( [\\] ["] ) | ( [\\] [u] [0-9a-fA-F] [0-9a-zA-F] ) ) * ["]

comment [/] [/] ([]*) [\r\n] {ignoreLastWord=true;}

arithmeticOperator [-+*/%&|^~=]

logicalOperator ([<>]) | ([<>=!][=]) | ([&][&]) | ([|][|])

semicolon [;]

parenthesis [{}] | [()]

keyword [a-zA-Z]+ 

dollarsign [$]

colon [:]

comma [,]

type ( [i][n][t]) | ( [f][l][o][a][t]) | ( [t][r][i]) | ( [s][e][v])

keyword  ( [w][h][e][n]) | ( [e][l][s][e]) | ( [f][o][r][e][a][c][h]) | ( [c][h][o][i][c][e]) | ( [o][p][t][i][o][n]) | ( [n][o][o][p][t][i][o][n]) | ( [r][e][t][u][r][n]) | ( [e][n][d]) | ( [f][i][n])

# Примеры

$(x3y,120)


x1y N123n a0B M2a xY 462376 0 46237 0.123342354 10.42367 1.0 2101012x3 102x3 1212x3 1123456x7 102065x7 112x7 'a' 'b' '_' '4' '*' "" "NSTU" "ns\"a\"tu" // Текст комментария
+ - / % * <= && == != >=


# For lab 3

For lab_3: 

operation "+" | "-" | "/" | "*" | ">" | "<" | "==" | "1=" | ">=" | "<=" | "&&" | "||" 

operation ( [+] | [>] | [=] | [<] | [-] | [*] | [/] ) | ( [|] [|] ? ) | ( [&] [&] ? ) | ( [=] [=] ? ) | ( [<] [=] ? ) | ( [>] [=] ? ) | ( [!] ? [=] )


# TODO:
4. Вручную историю работы сканера для оператора присваивания
