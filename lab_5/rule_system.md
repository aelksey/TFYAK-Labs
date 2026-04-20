program programItem *
programItem operator | function
blockOrOperator block | statement
block "{" statementList "}"
statementList ( statement statementList ) ?
statement operator | cycleBreak
operator assignment | condition | cycle | switch | returnValue | typization
typization "@" type id ";"
id [a-zA-Z] [0-9] {,3} [a-zA-Z]
constDecimal [0-9] + ( [.] [0-9] * ) ?
constThree [0-2] + [x] [3]
constSeven [0-6] + [x] [7]
constChar ['] ( [] | [\\] [u] [0-9a-fA-F] [0-9a-zA-F] ) [']
constString ["] ( [] | ( [\\] ["] ) | ( [\\] [u] [0-9a-fA-F] [0-9a-zA-F] ) ) * ["]
type "int" | "char" | "string" | "float" | "void"
constInteger 	constDecimal|constThree|constSeven
cycleBreak ("leave" ";")
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
condition "when" expr blockOrOperator condTail
condTail "else" blockOrOperator
condTail ~ "else"
cycle "foreach" "(" id "in" constInteger ":" constInteger ( ":" constInteger ) ? ")" cycleBody
cycleBody blockOrOperator
switch "choice" expr ( "option" constInteger ":" switchBody ) + switchTail "end"
switchBody ( blockOrOperator * ("fin" ";") ? )
switchTail "nooption" switchBody
switchTail ~ "nooption"
function type ? "(" argList ")" block
argList ( type ? id ( "," type ? id ) * ) ?
returnValue "return" type ? expr ";"
