/**
 * Parser build AST tree from array of token
 */

import {Token, TokenType} from "./token"
import {DuckType} from "./types"
import {Expr} from "./ast/expr"
import {TypeExpr} from "./ast/typeexpr"
import {Stmt} from "./ast/stmt"
import {Reporter} from "./error"

export class ParserError {
    constructor(public token : Token, public message : string){}
}

const BinaryPrecedences = [
    [TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL],
    [TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL],
    [TokenType.MINUS, TokenType.PLUS],
    [TokenType.SLASH, TokenType.STAR]
];

export class Parser {
    private current = 0;

    constructor(private tokens : Token[]){}

    public parse() : Stmt[] {
        let statements : Stmt[] = [];
        
        while(!this.isAtEnd()){
            let stmt = this.declaration();
            if (stmt) statements.push(stmt);
        }

        return statements
    }

    private declaration() : Stmt | undefined {
        // TODO: whether only function and declaration at top?
        try {
            if (this.match(TokenType.LET)) return this.varDeclaration();
            if (this.match(TokenType.STRUCT)) return this.structDeclaration();
            if (this.match(TokenType.FUNC)) return this.funcDeclaration();

            return this.statement(); 
        } catch(err){
            Reporter.report(err.token.line, err.message);
            this.synchronize();
        }
    }

    private statement() : Stmt {
        if (this.match(TokenType.IF)) return this.ifStatement();
        if (this.match(TokenType.WHILE)) return this.whileStatement();
        if (this.match(TokenType.LEFT_BRACE)) return this.blockStatement();

        return this.expressionStatement();
    }

    private assignment(variable : Expr) : Stmt {
        let token = this.previous();
        let expr = this.expression();
        let stmt;

        if (variable instanceof Expr.Variable){
            stmt = new Stmt.Assignment(variable.name, expr);
        } else if (variable instanceof Expr.Indexing){
            stmt = new Stmt.SetIndex(variable, token, expr);
        } else if (variable instanceof Expr.GetMember) {
            stmt = new Stmt.SetMember(variable, token, expr);
        } else {
            throw this.error(token, "Invalid assignment target");
        }

        this.match(TokenType.SEMICOLON);

        return stmt;
    }

    private block(): Stmt[] {
        let statements : Stmt[] = [];

        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()){
            let stmt = this.declaration();
            if (stmt) statements.push(stmt);
        }

        this.consume(TokenType.RIGHT_BRACE, "Expect '}");
        return statements;
    }

    private blockStatement() : Stmt {
        return new Stmt.Block(this.block());
    }

    private expressionStatement() : Stmt {
        let expr = this.expression();

        if (this.match(TokenType.EQUAL)){
            return this.assignment(expr);
        }

        this.match(TokenType.SEMICOLON);

        return new Stmt.Expression(expr);
    }

    private funcDeclaration() : Stmt {
        let token = this.previous();

        let name = this.consume(TokenType.IDENTIFIER, "Expect function name");
        
        this.consume(TokenType.LEFT_PAREN, "Expect '('");

        // read parameter
        let params : Stmt.Parameter[] = [];        

        if (!this.check(TokenType.RIGHT_PAREN)){
            do {
                let param = this.consume(TokenType.IDENTIFIER, "Expect parameter name");
                this.consume(TokenType.COLON, "Expect ':'");
                
                let typeExpr = this.typeExpression();
                params.push([param, typeExpr]);
            } while(this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RIGHT_PAREN, "Expect ')'");

        // read return type
        let returnType : TypeExpr | undefined;

        if (this.match(TokenType.COLON)){
            returnType = this.typeExpression();
        }

        // read body
        this.consume(TokenType.LEFT_BRACE, "Expect '{");

        let body : Stmt[] = [];

        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()){
            let stmt = this.declaration();
            if (stmt) body.push(stmt);
        }

        this.consume(TokenType.RIGHT_BRACE, "Expect '}");

        return new Stmt.Func(name, params, body, returnType);
    }

    private ifStatement() : Stmt {
        let token = this.previous();
        let condition = this.expression();

        this.consume(TokenType.LEFT_BRACE, "Expect '{' after if condition");
        let thenBranch = this.blockStatement();

        let elseBranch;

        if (this.match(TokenType.ELSE)){
            if (this.match(TokenType.IF)){
                elseBranch = this.ifStatement();
            } else {
                this.consume(TokenType.LEFT_BRACE, "Expect '{' after else");
                elseBranch = this.blockStatement();
            }
        }

        return new Stmt.If(token, condition, thenBranch, elseBranch);
    }

    private structDeclaration() : Stmt {
        let name = this.consume(TokenType.IDENTIFIER, "Expect a struct name");

        this.consume(TokenType.LEFT_BRACE, "Expect '{'");

        let members : Stmt.Parameter[] = [];

        do {
            let memberVar = this.consume(TokenType.IDENTIFIER, "Expect member name");
            this.consume(TokenType.COLON, "Expect ':'");

            let typeexpr = this.typeExpression();

            members.push([memberVar, typeexpr]);

            this.match(TokenType.COMMA); // optional comma

        } while (!this.check(TokenType.RIGHT_BRACE));

        this.consume(TokenType.RIGHT_BRACE, "Expect '}");

        return new Stmt.Struct(name, members);
    }

    private whileStatement() : Stmt {
        let token = this.previous();
        let condition = this.expression();

        this.consume(TokenType.LEFT_BRACE, "Expect '{' after loop condition");
        let body = this.blockStatement();

        return new Stmt.While(token, condition, body);
    }

    private varDeclaration() : Stmt {
        let name = this.consume(TokenType.IDENTIFIER, "Expect a variable name");

        let typeDefinition;

        if (this.match(TokenType.COLON)){
            typeDefinition = this.typeExpression();
        }

        let initializer;

        if (this.match(TokenType.EQUAL)){
            initializer = this.expression();
        }

        if (!typeDefinition && !initializer){
            throw this.error(this.previous(), "Variable declaration have to be typed if not initialized");
        }

        this.match(TokenType.SEMICOLON);

        return new Stmt.VarDecl(name, typeDefinition, initializer);
    }

    /*** Type Annotation Parsing ***/
    private typeExpression() : TypeExpr {
        let texpr: TypeExpr | undefined;

        if (this.match(TokenType.TYPE_BOOL, TokenType.TYPE_NUMBER, TokenType.TYPE_STRING)){
            let token = this.previous();
            texpr = new TypeExpr.Basic(token, <DuckType>token.literalType);
        } else if (this.match(TokenType.IDENTIFIER)){
            let name = this.previous();
            texpr = new TypeExpr.Custom(name);
        }
        
        if (!texpr){
            throw this.error(this.peek(), "Expect type.");
        }

        // match array types
        while(this.match(TokenType.LEFT_SQUARE)){
            this.consume(TokenType.RIGHT_SQUARE, "Expect ']'");
            texpr = new TypeExpr.List(this.previous(), texpr);
        }

        return texpr;
    }

    /*** Expression Parsing ***/

    private expression() : Expr {
        return this.binary(0);
    }

    private binary(precedence : number) : Expr {
        if (precedence >= BinaryPrecedences.length){
            return this.unary();
        }

        let expr = this.binary(precedence + 1);
        let types = BinaryPrecedences[precedence];

        while (this.match(...types)){
            let operator = this.previous();
            let right = this.binary(precedence + 1);

            expr = new Expr.Binary(expr, operator, right);
        }

        return expr;
    }

    private unary() : Expr {
        if (this.match(TokenType.BANG, TokenType.MINUS)){
            let operator = this.previous();
            let right = this.unary();
            return new Expr.Unary(operator, right);
        }

        return this.call();
    }

    private call() : Expr {
        let expr = this.primary();
        while (true){
            if (this.match(TokenType.LEFT_PAREN)){ 
                expr = this.finishCall(expr);
            } else if (this.match(TokenType.LEFT_SQUARE)){
                expr = new Expr.Indexing(this.previous(), expr, this.expression());
                this.consume(TokenType.RIGHT_SQUARE, "Expect ']'");
            } else  if (this.match(TokenType.DOT)){
                let member = this.consume(TokenType.IDENTIFIER, "Expect identifier");
                expr = new Expr.GetMember(this.previous(), expr, member);
            } else {
                break;
            }
        }

        return expr;
    }

    private finishCall(callee : Expr) : Expr{
        let args : Expr.PairParameter[] = [];

        if (!this.check(TokenType.RIGHT_PAREN)){
            do {
                let name = null;
                let expr = this.expression();
                if (this.match(TokenType.EQUAL)){
                    if (!(expr instanceof Expr.Variable)){
                        throw this.error(this.previous(), "Invalid argument assignment target");
                    }

                    name = expr.name;
                    expr = this.expression();
                } 

                args.push([name, expr]);
            } while(this.match(TokenType.COMMA));
        }

        let token = this.consume(TokenType.RIGHT_PAREN, "Expect ')' after call expression");

        return new Expr.Call(callee, token, args);
    }

    private primary() : Expr {
        if (this.match(TokenType.FALSE, TokenType.TRUE, TokenType.NUMBER, TokenType.STRING)){
            let token = this.previous();
            return new Expr.Literal(token.literal, <DuckType>token.literalType);            
        }

        if (this.match(TokenType.IDENTIFIER)){
            return new Expr.Variable(this.previous());
        }

        if (this.match(TokenType.LEFT_SQUARE)){
            return this.list();
        }

        if (this.match(TokenType.LEFT_PAREN)){
            let expr = this.expression();

            this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression");
            return new Expr.Grouping(expr);
        }
        
        throw this.error(this.peek(), "Expect expression.");
    }

    private list() : Expr {
        let token = this.previous();
        let elements : Expr[] = [];

        if (this.peek().tokenType !== TokenType.RIGHT_SQUARE){
            do {
                elements.push(this.expression());
            } while (this.match(TokenType.COMMA));
        }

        this.consume(TokenType.RIGHT_SQUARE, "Expect ']'");
        
        return new Expr.List(token, elements);
    }

    /*** Parsing Primitives ***/

    private advance() : Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private check(type : TokenType) : boolean {
        if (this.isAtEnd()) return false;
        return this.peek().tokenType === type;
    }

    private checkNext(type : TokenType) : boolean {
        return this.peekNext().tokenType === type;
    }

    private consume(type : TokenType, message: string) : Token {
        if (this.check(type)) return this.advance();

        throw this.error(this.peek(), message);
    }

    private isAtEnd() : boolean {
        return (this.peek().tokenType === TokenType.EOF);
    }

    private match(...types : TokenType[]) : boolean {
        for (let type of types){
            if (this.check(type)){
                this.advance();
                return true;
            }
        }

        return false;
    }

    private peek() : Token {
        return this.tokens[this.current];
    }

    private peekNext() : Token {
        if (this.isAtEnd()) return this.peek();
        return this.tokens[this.current];
    }

    private previous() : Token {
        return this.tokens[this.current - 1];
    }

    private error(token : Token, message : string) : ParserError{
        return new ParserError(token, message);
    }

    private synchronize() {
        this.advance();

        while (!this.isAtEnd()){
            if (this.previous().tokenType == TokenType.SEMICOLON)
                return;
            
            switch(this.peek().tokenType){
                case TokenType.LET:
                case TokenType.IF:
                case TokenType.WHILE:
                case TokenType.PRINT:
                    return;
                
                default:
            }

            this.advance();
        }
    }
}