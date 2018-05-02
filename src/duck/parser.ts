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
            try {
                statements.push(this.declaration());
            } catch(err){
                Reporter.report(err.token.line, err.message);
                this.synchronize();
            }
        }

        return statements
    }

    private declaration() : Stmt {
        // TODO: whether only function and declaration at top?
        if (this.match(TokenType.LET)) return this.varDeclaration();

        return this.statement(); 
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

        if (!(variable instanceof Expr.Variable)){
            throw this.error(token, "Invalid assignment target");            
        }

        this.consume(TokenType.SEMICOLON, "Expect ';' after expression");

        return new Stmt.Assignment(variable.name, expr);
    }

    private block(): Stmt[] {
        let statements : Stmt[] = [];

        while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()){
            statements.push(this.declaration());
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

        this.consume(TokenType.SEMICOLON, "Expect ';' after expression");

        return new Stmt.Expression(expr);
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

        this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration");        

        return new Stmt.VarDecl(name, typeDefinition, initializer);
    }


    private typeExpression() : TypeExpr {
        let texpr: TypeExpr | undefined;

        if (this.match(TokenType.TYPE_BOOL, TokenType.TYPE_NUMBER, TokenType.TYPE_STRING)){
            let token = this.previous();
            texpr = new TypeExpr.Basic(token, <DuckType>token.literalType);
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
            if (this.match(TokenType.LEFT_SQUARE)){
                expr = new Expr.Indexing(this.previous(), expr, this.expression());
                this.consume(TokenType.RIGHT_SQUARE, "Expect ']'");
            } else {
                break;
            }
        }

        return expr;
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
        // this.advance();

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