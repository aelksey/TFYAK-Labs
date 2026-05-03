```
program {operatorCnt=0;} programItem *
programItem operator
operator assignment | condition | cycle | switch | returnValue | typization
assignment "$" "(" ( expr | ( type "(" argList ")" block ) ) {flushAllOp();} "," {toPFR(this.currentLexem[1]);} id {toPFR("=");} ")" ";"
condition {begCond();} "when" expr {endCondExpr();} blockOrOperator {begCondEx();} condTail {endCond();}
cycle {begFor();} "foreach" "(" {saveForVar(this);} id "in" {putCurrLex(this);} constInteger {emitForInit();} ":" {begForCond();} {putCurrLex(this);} constInteger ( ":" {saveForStep(this);} constInteger ) ? ")" blockOrOperator {endFor();}
switch "choice" expr ( "option" constInteger ":" switchBody ) + switchTail "end"
returnValue "return" type ? expr ";"
typization "@" type id ";"
expr ( {opStk.push(this.currentLexem[1]);} UnaryOperator {flushUnOp();} ) ? exprHead exprTail
blockOrOperator block | statement
condTail "else" blockOrOperator
condTail ~ "else"
constInteger constDecimal | constThree | constSeven
switchTail "nooption" switchBody
type "int" | "char" | "string" | "float" | "void"
exprHead {toPFR(this.currentLexem[1]);} id ( "(" FactArgList ? ")" ) ?
exprHead {toPFR(this.currentLexem[1]);} const
exprHead { opStk.push("(");} "(" expr {popLeftBrack();} ")"
exprTail ( {pushBinOp(this.currentLexem[1]);} BinaryOperator expr {flushBinOp();} ) ?
block "{" statementList "}"
statement operator | cycleBreak
switchBody ( blockOrOperator * ( "fin" ";" ) ? )
argList ( type ? id ( "," type ? id ) * ) ?
const constDecimal | constThree | constSeven | constChar | constString
statementList ( statement statementList ) ?
cycleBreak ( "leave" ";" )
FactArgList expr ( "," expr ) *
id [a-zA-Z] [0-9] {,3} [a-zA-Z]
constDecimal [0-9] + ( [.] [0-9] * ) ?
constThree [0-2] + [x] [3]
constSeven [0-6] + [x] [7]
UnaryOperator [~!] | ( [-] [-] | [+] [+] )
constChar ['] ( [] | [\\] [u] [0-9a-fA-F] [0-9a-zA-F] ) [']
constString ["] ( [] | ( [\\] ["] ) | ( [\\] [u] [0-9a-fA-F] [0-9a-zA-F] ) ) * ["]
BinaryOperator [-+*/] | ( [&] [&] ) | ( [|] [|] ) | ( [-+*/!=] [=] ) | ( [<>] [=] ? )
space [ \t\r\n] + {ignoreLastWord=true;}
comment [/] [/] ( [] * ) [\r\n] {ignoreLastWord=true;}
```