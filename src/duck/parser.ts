import {Token, TokenType} from "./token"
import {DuckType} from "./types"
import {Expr} from "./ast/expr"


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

    public parseExpr() : Expr{
        return this.expression();
    }

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

        return this.primary();
    }

    private primary() : Expr {
        if (this.match(TokenType.FALSE) || this.match(TokenType.TRUE) || this.match(TokenType.NUMBER) || this.match(TokenType.STRING)){
            let token = this.previous();
            return new Expr.Literal(token.literal, token.literalType);            
        }

        if (this.match(TokenType.IDENTIFIER)){
            return new Expr.Variable(this.previous());
        }

        if (this.match(TokenType.LEFT_PAREN)){
            let expr = this.expression();

            this.consume(TokenType.RIGHT_PAREN, "Expect ')' after expression");
            return new Expr.Grouping(expr);
        }
        
        throw this.error(this.peek(), "Expect expression.");
    }

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
}