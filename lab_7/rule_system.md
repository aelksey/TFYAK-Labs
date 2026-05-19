program {operatorCnt=0;} programItem *
programItem operator
operator assignment | condition | cycle | switch | returnValue | typization
assignment "$" "(" ( expr | ( { startFuncDecl(this.currentLexem[1]); } type "(" argList ")" { emitFuncDecl(); } block ) ) { flushAllOp(); } "," { savedIdName = this.currentLexem[1]; } { toPFR(savedIdName); } id { toPFR("="); } ")" ";"
condition {begCond();} "when" expr {endCondExpr();} blockOrOperator {begCondEx();} condTail {endCond();}
cycle {begFor();} "foreach" "(" {saveForVar(this);} id "in" {putCurrLex(this);} constInteger {emitForInit();} ":" {begForCond();} {putCurrLex(this);} constInteger {emitForCond();} ( ":" {saveForStep(this);} constInteger ) ? ")" blockOrOperator {endFor();}
switch "choice" { begSwitch(); } expr { emitSwitchExpr(); } ( "option" { putCurrLex(this); } constInteger { begCase(); } ":" switchBody { endCase(); } ) + switchTail "end" { endSwitch(); }
returnValue {flushAllOp();} "return"  type ? expr { toPFR("RETURN"); } ";"
typization "@" { pushTypeCast(this.currentLexem[1]); } type { saveTypizationId(this.currentLexem[1]); toPFR(typizationId); toPFR(typizationType); toPFR("DECLARE_VAR"); } id ";"
expr ( {pushUnOp(this.currentLexem[1]);} ( UnaryOperator | minus ) {flushUnOp();} ) ? exprHead exprTail
blockOrOperator block | statement
condTail "else" blockOrOperator
condTail ~ "else"
constInteger constDecimal | constThree | constSeven
switchTail "nooption" switchBody
type "int" | "char" | "string" | "float" | "void"
exprHead { pushFnName(this.currentLexem[1]); toPFR(this.currentLexem[1]); } id ("(" { startArgs(); } FactArgList ? ")" { emitFnCall(); } | { cancelFnName(); })?
exprHead {toPFR(this.currentLexem[1]);} const
exprHead { opStk.push("(");} "(" expr {popLeftBrack();} ")"
exprTail ( {pushBinOp(this.currentLexem[1]);} ( BinaryOperator | minus ) expr {flushBinOp();} ) ?
block "{" statementList "}"
statement operator | cycleBreak
switchBody ( blockOrOperator * ( "fin" {emitSwitchExit();} ";" ) ? )
argList ( ( type { tempArgType = this.currentLexem[1]; } )?    id { tempArgId = this.currentLexem[1]; } { addFuncArg(tempArgType, tempArgId); }  tailArgList ) ?
const constDecimal | constThree | constSeven | constChar | constString
statementList ( statement statementList ) ?
cycleBreak ( "leave" ";" {emitLeave();} )
FactArgList { pushArg(); } expr ( "," { pushArg(); } expr ) *
tailArgList ( "," ( { tempArgType = this.currentLexem[1]; } type ) ?  { tempArgId = this.currentLexem[1]; } { addFuncArg(tempArgType, tempArgId); }  id   ) *
id [a-zA-Z] [0-9] {,3} [a-zA-Z]
constDecimal [0-9] + ( [.] [0-9] * ) ?
constThree [0-2] + [x] [3]
constSeven [0-6] + [x] [7]
UnaryOperator [~!] | ( [-] [-] | [+] [+] )
minus [-]
constChar ['] ( [] | [\\] [u] [0-9a-fA-F] [0-9a-zA-F] ) [']
constString ["] ( [] | ( [\\] ["] ) | ( [\\] [u] [0-9a-fA-F] [0-9a-zA-F] ) ) * ["]
BinaryOperator [+*/] | ( [&] [&] ) | ( [|] [|] ) | ( [-+*/!=] [=] ) | ( [<>] [=] ? )
space [ \t\r\n] + {ignoreLastWord=true;}
comment [/] [/] ( [] * ) [\r\n] {ignoreLastWord=true;}
tailArgList ( "," ( { tempArgType = this.currentLexem[1]; } type ) ?  { tempArgId = this.currentLexem[1]; } { addFuncArg(tempArgType, tempArgId); }  id   ) *

Тетрады: <Код><Оп><Оп><Р>

2 - есть запятая в DECL фунцкии
