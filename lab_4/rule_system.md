program programItem *
programItem operator | function
blockOrOperator block | statement
block "{" statementList "}"
statementList ( statement statementList ) ?
statement operator | cycleBreak
operator assignment | condition | cycle | switch | returnValue
id [a-zA-Z] [0-9] {,3} [a-zA-Z]
constDecimal [0-9] + ( [.] [0-9] * ) ?
constThree [0-2] + [x] [3]
constSeven [0-6] + [x] [7]
constChar ['] ( [] | [\\] [u] [0-9a-fA-F] [0-9a-zA-F] ) [']
constString ["] ( [] | ( [\\] ["] ) | ( [\\] [u] [0-9a-fA-F] [0-9a-zA-F] ) ) * ["]
UnaryOperator [-~!]
BinaryOperator [-+*/] | ( [&] [&] ) | ( [|] [|] ) | ( [-+*/!=] [=] ) | ( [<>] [=] ? )
space [ \t\r\n] + {ignoreLastWord=true;}
comment [/] [/] ( [] * ) [\r\n] {ignoreLastWord=true;}
const constDecimal | constThree | constSeven | constChar | constString
operation UnaryOperator | BinaryOperator
expr UnaryOperator? exprHead exprTail
exprHead id | const
exprTail ( operation expr ) ?
assignment "$" "(" expr "," id ")" ";"
condition "when" expr block condTail ";"
condTail ( "else" blockOrOperator ) ?
cycle "foreach" "(" id "in" const ":" const ( ":" const ) ? ")" cycleBody
cycleBody blockOrOperator
switch "choice" expr ( "option" const ":" switchBody ) + switchTail "end"
switchBody ( blockOrOperator + ("fin" ";") ? ) ?
switchTail ( "nooption" switchBody ) ?
type "int" | "char" | "string"
function type ? "(" argList ")" blockOrOperator
argList ( type ? id ( "," type ? id ) * ) ?
returnValue "return" type ? expr ";"
cycleBreak ("leave" ";")
